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
const ChooseVersion = require('./ChooseVersion.jsx')
const SelectBoard = require('./SelectBoard.jsx')
const SelectNetwork = require('./SelectNetwork.jsx')
const SetNetworkConfiguration = require('./SetNetworkConfiguration.jsx')
const { open: openExternal } = require('../../os/open-external/services/open-external')

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

const KiOSSelectorModal = ({ close }) => {
  const [ confirmModal, setConfirmModal ] = React.useState({ open: false })
  const [ step, setStep ] = React.useState({ count: 0 })

  const incrementStep = () => {
    // Check if a versio was selected.
    if(step.count === 0) {
      if(!selectionState.hasVersion()){
        return
      }
    } else if(step.count === 1) {
      if(!selectionState.hasBoard()){
        return
      }
    } else if(step.count === 2) {
      if(!selectionState.hasConnection()){
        return
      }
    }
    if(step.count === 3) {
      close()
    }
    setStep({ count: step.count + 1 });
  };

  let title = 'Select a Version'
  if (step.count === 1) {
    title = 'Select Board'
  } else if (step.count === 2) {
    title = 'Select Network'
  } else if (step.count === 3) {
    title = 'Set Network Configurations'
  }

  return (
    <Modal
      className='modal-drive-selector-modal'
      title={title}
      done={incrementStep}
      action='Continue'
      style={{
        padding: '20px 30px 11px 30px'
      }}
    >

      { step.count === 0 && <ChooseVersion /> }
      { step.count === 1 && <SelectBoard /> }
      { step.count === 2 && <SelectNetwork /> }
      { step.count === 3 && <SetNetworkConfiguration /> }

      {confirmModal.open && <Modal
        {...confirmModal.options}
      >
      </Modal>
    }
    </Modal>
  )
}

module.exports = KiOSSelectorModal
