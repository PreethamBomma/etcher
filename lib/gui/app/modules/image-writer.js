/*
 * Copyright 2016 balena.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict'

const Bluebird = require('bluebird')
const _ = require('lodash')
const path = require('path')
const tmp = require('tmp');
const os = require('os')
const fs = require('fs')
const zlib = require('zlib')
const {gzip, ungzip} = require('node-gzip');
const request = require('request')
const imagefs = require('resin-image-fs')
const ipc = require('node-ipc')
const electron = require('electron')
const store = require('../models/store')
const settings = require('../models/settings')
const flashState = require('../models/flash-state')
const errors = require('../../../shared/errors')
const permissions = require('../../../shared/permissions')
const windowProgress = require('../os/window-progress')
const analytics = require('../modules/analytics')
const updateLock = require('./update-lock')
const packageJSON = require('../../../../package.json')
const selectionState = require('../models/selection-state')

/**
 * @summary Number of threads per CPU to allocate to the UV_THREADPOOL
 * @type {Number}
 * @constant
 */
const THREADS_PER_CPU = 16

/**
 * @summary Handle a flash  error and log it to analytics
 * @function
 * @private
 *
 * @param {Error} error - error object
 * @param {Object} analyticsData - analytics object
 *
 * @example
 * handleErrorLogging({ code: 'EUNPLUGGED' }, { image: 'balena.img' })
 */
const handleErrorLogging = (error, analyticsData) => {
  const eventData = _.assign({
    applicationSessionUuid: store.getState().toJS().applicationSessionUuid,
    flashingWorkflowUuid: store.getState().toJS().flashingWorkflowUuid,
    flashInstanceUuid: flashState.getFlashUuid()
  }, analyticsData)

  if (error.code === 'EVALIDATION') {
    analytics.logEvent('Validation error', eventData)
  } else if (error.code === 'EUNPLUGGED') {
    analytics.logEvent('Drive unplugged', eventData)
  } else if (error.code === 'EIO') {
    analytics.logEvent('Input/output error', eventData)
  } else if (error.code === 'ENOSPC') {
    analytics.logEvent('Out of space', eventData)
  } else if (error.code === 'ECHILDDIED') {
    analytics.logEvent('Child died unexpectedly', eventData)
  } else {
    analytics.logEvent('Flash error', _.merge({
      error: errors.toJSON(error)
    }, eventData))
  }
}

/**
 * @summary Perform write operation
 * @function
 * @private
 *
 * @description
 * This function is extracted for testing purposes.
 *
 * @param {String} image - image path
 * @param {Array<String>} drives - drives
 * @param {Function} onProgress - in progress callback (state)
 *
 * @fulfil {Object} - flash results
 * @returns {Promise}
 *
 * @example
 * imageWriter.performWrite('path/to/image.img', [ '/dev/disk2' ], (state) => {
 *   console.log(state.percentage)
 * })
 */
exports.performWrite = (image, drives, onProgress) => {
  // There might be multiple Etcher instances running at
  // the same time, therefore we must ensure each IPC
  // server/client has a different name.
  const IPC_SERVER_ID = `etcher-server-${process.pid}`
  const IPC_CLIENT_ID = `etcher-client-${process.pid}`

  ipc.config.id = IPC_SERVER_ID
  ipc.config.socketRoot = path.join(process.env.XDG_RUNTIME_DIR || os.tmpdir(), path.sep)

  // NOTE: Ensure this isn't disabled, as it will cause
  // the stdout maxBuffer size to be exceeded when flashing
  ipc.config.silent = true
  ipc.serve()

  /**
   * @summary Safely terminate the IPC server
   * @function
   * @private
   *
   * @example
   * terminateServer()
   */
  const terminateServer = () => {
    // Turns out we need to destroy all sockets for
    // the server to actually close. Otherwise, it
    // just stops receiving any further connections,
    // but remains open if there are active ones.
    _.each(ipc.server.sockets, (socket) => {
      socket.destroy()
    })

    ipc.server.stop()
  }

  return new Bluebird((resolve, reject) => {
    ipc.server.on('error', (error) => {
      terminateServer()
      const errorObject = errors.fromJSON(error)
      reject(errorObject)
    })

    ipc.server.on('log', (message) => {
      console.log(message)
    })

    const flashResults = {}
    const analyticsData = {
      image,
      drives,
      driveCount: drives.length,
      uuid: flashState.getFlashUuid(),
      flashInstanceUuid: flashState.getFlashUuid(),
      unmountOnSuccess: settings.get('unmountOnSuccess'),
      validateWriteOnSuccess: settings.get('validateWriteOnSuccess'),
      trim: settings.get('trim')
    }

    ipc.server.on('fail', ({ device, error }) => {
      handleErrorLogging(error, analyticsData)
    })

    ipc.server.on('done', (event) => {
      event.results.errors = _.map(event.results.errors, (data) => {
        return errors.fromJSON(data)
      })
      _.merge(flashResults, event)
    })

    ipc.server.on('abort', () => {
      terminateServer()
      resolve({
        cancelled: true
      })
    })

    ipc.server.on('state', onProgress)

    ipc.server.on('ready', (data, socket) => {
      ipc.server.emit(socket, 'write', {
        imagePath: image,
        destinations: drives,
        validateWriteOnSuccess: settings.get('validateWriteOnSuccess'),
        trim: settings.get('trim'),
        unmountOnSuccess: settings.get('unmountOnSuccess')
      })
    })

    const argv = _.attempt(() => {
      let entryPoint = electron.remote.app.getAppPath()

      // AppImages run over FUSE, so the files inside the mount point
      // can only be accessed by the user that mounted the AppImage.
      // This means we can't re-spawn Etcher as root from the same
      // mount-point, and as a workaround, we re-mount the original
      // AppImage as root.
      if (os.platform() === 'linux' && process.env.APPIMAGE && process.env.APPDIR) {
        entryPoint = _.replace(entryPoint, process.env.APPDIR, '')
        return [
          process.env.APPIMAGE,
          '-e',
          `require(\`\${process.env.APPDIR}${entryPoint}\`)`
        ]
      }
      return [
        _.first(process.argv),
        entryPoint
      ]
    })

    ipc.server.on('start', () => {
      console.log(`Elevating command: ${_.join(argv, ' ')}`)

      const env = _.assign({}, process.platform === 'win32' ? {} : process.env, {
        IPC_SERVER_ID,
        IPC_CLIENT_ID,
        IPC_SOCKET_ROOT: ipc.config.socketRoot,
        ELECTRON_RUN_AS_NODE: 1,
        UV_THREADPOOL_SIZE: os.cpus().length * THREADS_PER_CPU,

        // This environment variable prevents the AppImages
        // desktop integration script from presenting the
        // "installation" dialog
        SKIP: 1
      })

      permissions.elevateCommand(argv, {
        applicationName: packageJSON.displayName,
        environment: env
      }).then((results) => {
        flashResults.cancelled = results.cancelled
        console.log('Flash results', flashResults)

        // This likely means the child died halfway through
        if (!flashResults.cancelled && !_.get(flashResults, [ 'results', 'bytesWritten' ])) {
          throw errors.createUserError({
            title: 'The writer process ended unexpectedly',
            description: 'Please try again, and contact the Etcher team if the problem persists',
            code: 'ECHILDDIED'
          })
        }

        resolve(flashResults)
      }).catch((error) => {
        // This happens when the child is killed using SIGKILL
        const SIGKILL_EXIT_CODE = 137
        if (error.code === SIGKILL_EXIT_CODE) {
          error.code = 'ECHILDDIED'
        }
        reject(error)
      }).finally(() => {
        console.log('Terminating IPC server')
        terminateServer()
      })
    })

    // Clear the update lock timer to prevent longer
    // flashing timing it out, and releasing the lock
    updateLock.pause()
    ipc.server.start()
  })
}

/**
 * @summary Flash an image to drives
 * @function
 * @public
 *
 * @description
 * This function will update `imageWriter.state` with the current writing state.
 *
 * @param {String} image - image path
 * @param {Array<String>} drives - drives
 * @returns {Promise}
 *
 * @example
 * imageWriter.flash('foo.img', [ '/dev/disk2' ]).then(() => {
 *   console.log('Write completed!')
 * })
 */


exports.downloadFile = (file_url, targetPath, resolve) => {
    // Save variable to know progress
    var received_bytes = 0;
    var total_bytes = 0;

    var req = request({
        method: 'GET',
        uri: file_url
    });

    var out = fs.createWriteStream(targetPath);
    req.pipe(out);

    req.on('response', function ( data ) {
        // Change the total bytes value to get progress later.
        total_bytes = parseInt(data.headers['content-length' ]);
    });

    req.on('data', function(chunk) {
        // Update the received bytes
        received_bytes += chunk.length;
        exports.showProgress(received_bytes, total_bytes);
        const state = {
          downloading: 1,
          flashing: 0,
          validating: 0,
          percentage: (received_bytes * 100) / total_bytes,
          speed: 1000,
          totalSpeed: 1000,
          failed: 0,
          type: "downloading",
        }
        flashState.setProgressState(state)
    });

    req.on('end', function() {
        resolve();
        alert("File succesfully downloadedok");
    });
}

exports.showProgress = (received,total) => {
    var percentage = (received * 100) / total;
    console.log(percentage + "% | " + received + " bytes out of " + total + " bytes.");
}

exports.flash = (image, drives) => {
  if (flashState.isFlashing()) {
    return Bluebird.reject(new Error('There is already a flash in progress'))
  }

  flashState.setFlashingFlag()

  const analyticsData = {
    image,
    drives,
    driveCount: drives.length,
    uuid: flashState.getFlashUuid(),
    status: 'started',
    flashInstanceUuid: flashState.getFlashUuid(),
    unmountOnSuccess: settings.get('unmountOnSuccess'),
    validateWriteOnSuccess: settings.get('validateWriteOnSuccess'),
    trim: settings.get('trim'),
    applicationSessionUuid: store.getState().toJS().applicationSessionUuid,
    flashingWorkflowUuid: store.getState().toJS().flashingWorkflowUuid
  }

  analytics.logEvent('Flash', analyticsData)

  var file = tmp.fileSync();
  var fileUnzipped = {
    name: "/Users/i353408/Downloads/kios-raspberrypi2-2.8.0-blablaa.img",
  }// tmp.fileSync();

  return new Bluebird((resolve, reject) => {
    const url = "https://github.com/kerberos-io/kios/releases/download/v2.7.2/kios-raspberrypi3-20180714.img.gz";
    const fileName = file.name;
    exports.downloadFile(url, fileName, () => {
      fs.readFile(fileName, function(err, data) {
        if (err) throw err;
        zlib.gunzip(data, (err, dezipped) =>
        {
          fs.writeFile(fileUnzipped.name, dezipped, () => {
            resolve();
          });
        });
      });
    });
  }).then(() => {
    return imagefs.writeFile({
      image: fileUnzipped.name,
      partition: 1,
      path: 'wireless.conf',
    }, `update_config=1
    ctrl_interface=/var/run/wpa_supplicant

    network={
        scan_ssid=1
        ssid="telenet-10D7F"
        psk="louizamoesj"
    }`);
  }).then(() => {
    return imagefs.writeFile({
      image: fileUnzipped.name,
      partition: 1,
      path: 'static_ip.conf',
    }, `#####################################################################
    # Enter the IP-address you want to have, followed by the subnet mask
    # e.g. 192.168.0.10/24

    static_ip="192.168.0.222/24"

    #####################################################################
    # Enter the Gateway and DNS, this will be your router in most cases
    # e.g. 192.168.0.1

    static_gw="192.168.0.1"
    static_dns="8.8.8.8"`);
  }).then(() => {
    return exports.performWrite(fileUnzipped.name, drives, (state) => {
      flashState.setProgressState(state)
    }).then(flashState.unsetFlashingFlag).then(() => {
      if (flashState.wasLastFlashCancelled()) {
        const eventData = _.assign({ status: 'cancel' }, analyticsData)
        analytics.logEvent('Elevation cancelled', eventData)
      } else {
        const { results } = flashState.getFlashResults()
        const eventData = _.assign({
          errors: results.errors,
          devices: results.devices,
          status: 'finished'
        },
        analyticsData)
        analytics.logEvent('Done', eventData)
      }
    }).catch((error) => {
      flashState.unsetFlashingFlag({
        errorCode: error.code
      })

      // eslint-disable-next-line no-magic-numbers
      if (drives.length > 1) {
        const { results } = flashState.getFlashResults()
        const eventData = _.assign({
          errors: results.errors,
          devices: results.devices,
          status: 'failed'
        },
        analyticsData)
        analytics.logEvent('Write failed', eventData)
      }

      return Bluebird.reject(error)
    }).finally(() => {
      windowProgress.clear()
    })
  });
}

/**
 * @summary Cancel write operation
 * @function
 * @public
 *
 * @example
 * imageWriter.cancel()
 */
exports.cancel = () => {
  const drives = selectionState.getSelectedDevices()
  const analyticsData = {
    image: selectionState.getImagePath(),
    drives,
    driveCount: drives.length,
    uuid: flashState.getFlashUuid(),
    flashInstanceUuid: flashState.getFlashUuid(),
    unmountOnSuccess: settings.get('unmountOnSuccess'),
    validateWriteOnSuccess: settings.get('validateWriteOnSuccess'),
    trim: settings.get('trim'),
    applicationSessionUuid: store.getState().toJS().applicationSessionUuid,
    flashingWorkflowUuid: store.getState().toJS().flashingWorkflowUuid,
    status: 'cancel'
  }
  analytics.logEvent('Cancel', analyticsData)

  // Re-enable lock release on inactivity
  updateLock.resume()

  try {
    const [ socket ] = ipc.server.sockets
    // eslint-disable-next-line no-undefined
    if (socket !== undefined) {
      ipc.server.emit(socket, 'cancel')
    }
  } catch (error) {
    analytics.logException(error)
  }
}
