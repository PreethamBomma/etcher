/*
 * Copyright 2019 balena.io
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

const _ = require('lodash')
const React = require('react')
const { Modal } = require('rendition')
const {
  isDriveValid,
  getDriveImageCompatibilityStatuses,
  hasListDriveImageCompatibilityStatus,
  COMPATIBILITY_STATUS_TYPES
} = require('../../../../shared/drive-constraints')
const store = require('../../models/store')
const analytics = require('../../modules/analytics')
const availableDrives = require('../../models/available-drives')
const availableVersions = require('../../models/available-versions')
const selectionState = require('../../models/selection-state')
const { bytesToClosestUnit } = require('../../../../shared/units')
const utils = require('../../../../shared/utils')
const { open: openExternal } = require('../../os/open-external/services/open-external')

/**
 * @summary Determine if we can change a drive's selection state
 * @function
 * @private
 *
 * @param {Object} drive - drive
 * @returns {Promise}
 *
 * @example
 * shouldChangeDriveSelectionState(drive)
 *    .then((shouldChangeDriveSelectionState) => {
 *        if (shouldChangeDriveSelectionState) doSomething();
 *    });
 */
const shouldChangeVersionSelectionState = (drive) => {
  return isDriveValid(drive, selectionState.getImage())
}

/**
 * @summary Toggle a drive selection
 * @function
 * @public
 *
 * @param {Object} drive - drive
 * @returns {void}
 *
 * @example
 * toggleDrive({
 *   device: '/dev/disk2',
 *   size: 999999999,
 *   name: 'Cruzer USB drive'
 * });
 */
const toggleVersion = (version) => {
  selectionState.selectVersion(version)
}

/**
 * @summary Memoized getDrives function
 * @function
 * @public
 *
 * @returns {Array<Object>} - memoized list of drives
 *
 * @example
 * const drives = getDrives()
 * // Do something with drives
 */
const getDrives = utils.memoize(availableDrives.getDrives, _.isEqual)
const getVersions = utils.memoize(availableVersions.getVersions, _.isEqual)

/**
 * @summary Get a drive's compatibility status object(s)
 * @function
 * @public
 *
 * @description
 * Given a drive, return its compatibility status with the selected image,
 * containing the status type (ERROR, WARNING), and accompanying
 * status message.
 *
 * @returns {Object[]} list of objects containing statuses
 *
 * @example
 * const statuses = getDriveStatuses(drive);
 *
 * for ({ type, message } of statuses) {
 *   // do something
 * }
 */
const getDriveStatuses = utils.memoize((drive) => {
  return getDriveImageCompatibilityStatuses(drive, selectionState.getImage())
}, _.isEqual)

/**
 * @summary Keyboard event drive toggling
 * @function
 * @public
 *
 * @description
 * Keyboard-event specific entry to the toggleDrive function.
 *
 * @param {Object} drive - drive
 * @param {Object} evt - event
 *
 * @example
 * <div tabindex="1" onKeyPress="keyboardToggleDrive(drive, evt)">
 *   Tab-select me and press enter or space!
 * </div>
 */
const keyboardToggleDrive = (drive, evt) => {
  const ENTER = 13
  const SPACE = 32
  if (_.includes([ ENTER, SPACE ], evt.keyCode)) {
    toggleDrive(drive)
  }
}

const KiOSSelectorModal = ({ close }) => {
  const [ confirmModal, setConfirmModal ] = React.useState({ open: false })
  const [ drives, setDrives ] = React.useState(getDrives())
  const [ versions, setVersions ] = React.useState(getVersions())

  React.useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setDrives(availableDrives.getDrives())
      setVersions(availableVersions.getVersions())
    })
    return unsubscribe
  })

  /**
   * @summary Prompt the user to install missing usbboot drivers
   * @function
   * @public
   *
   * @param {Object} drive - drive
   * @returns {void}
   *
   * @example
   * installMissingDrivers({
   *   linkTitle: 'Go to example.com',
   *   linkMessage: 'Examples are great, right?',
   *   linkCTA: 'Call To Action',
   *   link: 'https://example.com'
   * });
   */
  const installMissingDrivers = (drive) => {
    if (drive.link) {
      analytics.logEvent('Open driver link modal', {
        url: drive.link,
        applicationSessionUuid: store.getState().toJS().applicationSessionUuid,
        flashingWorkflowUuid: store.getState().toJS().flashingWorkflowUuid
      })

      setConfirmModal({
        open: true,
        options: {
          width: 400,
          title: drive.linkTitle,
          cancel: () => setConfirmModal({ open: false }),
          done: async (shouldContinue) => {
            try {
              if (shouldContinue) {
                openExternal(drive.link)
              } else {
                setConfirmModal({ open: false })
              }
            } catch (error) {
              analytics.logException(error)
            }
          },
          action: 'Yes, continue',
          cancelButtonProps: {
            children: 'Cancel'
          },
          children: drive.linkMessage || `Etcher will open ${drive.link} in your browser`
        }
      })
    }
  }

  /**
   * @summary Select a drive and close the modal
   * @function
   * @public
   *
   * @param {Object} drive - drive
   * @returns {void}
   *
   * @example
   * selectDriveAndClose({
   *   device: '/dev/disk2',
   *   size: 999999999,
   *   name: 'Cruzer USB drive'
   * });
   */
  const selectDriveAndClose = async (drive) => {
    const canChangeDriveSelectionState = await shouldChangeDriveSelectionState(drive)

    if (canChangeDriveSelectionState) {
      selectionState.selectDrive(drive.device)

      analytics.logEvent('Drive selected (double click)', {
        applicationSessionUuid: store.getState().toJS().applicationSessionUuid,
        flashingWorkflowUuid: store.getState().toJS().flashingWorkflowUuid
      })

      close()
    }
  }

  const hasStatus = hasListDriveImageCompatibilityStatus(selectionState.getSelectedDrives(), selectionState.getImage())

  return (
    <Modal
      className='modal-drive-selector-modal'
      title='Select a Version'
      done={close}
      action='Continue'
      style={{
        padding: '20px 30px 11px 30px'
      }}
      primaryButtonProps={{
        primary: !hasStatus,
        warning: hasStatus
      }}
    >
      <div>
        <ul style={{
          height: '250px',
          overflowX: 'hidden',
          overflowY: 'auto',
          padding: '0'
        }}>
          {_.map(versions, (version, index) => {
            return (
              <li
                key={`item-${version.assets_url}`}
                className="list-group-item"
                onClick={() => toggleVersion(version)}
              >

                <div
                  className="list-group-item-section list-group-item-section-expanded"
                  tabIndex={ 15 + index }>

                { version.name }

                </div>
                <span className="list-group-item-section tick tick--success"
                  disabled={!selectionState.isVersionSelected(version)}>
                </span>

              </li>
            )
          })}
          {!availableVersions.hasAvailableVersions() && <li className="list-group-item">
            <div>
              <b>Looking for releaes</b>
              <div>No releases for KiOS found.</div>
            </div>
          </li>}
        </ul>
      </div>

      {confirmModal.open && <Modal
        {...confirmModal.options}
      >
      </Modal>
    }
    </Modal>
  )
}

module.exports = KiOSSelectorModal
