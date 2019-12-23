'use strict'

const _ = require('lodash')
const React = require('react')
const utils = require('../../../../shared/utils')
const selectionState = require('../../models/selection-state')
const store = require('../../models/store')
const availableVersions = require('../../models/available-versions')
const { Select, Input, Flex } = require('rendition')

const toggleConnnection = (connection) => {
  selectionState.selectConnection(connection)
}

const toggleSSID = (ssid) => {
  selectionState.selectSSID(ssid)
}

const setCustSSID = (ssid) => {
  selectionState.setCustomSSID(ssid)
}

const setPassword = (password) => {
  selectionState.setPassword(password)
}

const SelectNetwork = () => {

  const [connection, setConnection] = React.useState(selectionState.getSelectedConnection());
  const [ssids, setSSIDS] = React.useState(availableVersions.getSSIDS());
  const [ssid, setSSID] = React.useState(selectionState.getSelectedSSID());
  const [customSSID, setCustomSSID] = React.useState(selectionState.getCustomSSID());
  const [passwordSSID, setPasswordSSID] = React.useState(selectionState.getPasswordSSID());

  React.useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setSSIDS(availableVersions.getSSIDS())
    })
    return unsubscribe
  })

  return (<div>
    <Flex flexDirection="column">
      <Select
        placeholder='Select how you want to connect'
        options={['Ethernet', 'Wireless']}
        value={connection ? connection : ''}
        onChange={({ option }) => {
          toggleConnnection(option)
          setConnection(option)
        }}
        margin={"10px"}/>
        { connection === 'Wireless' && ( <div>
            <Select
              placeholder='Looking for SSIDs'
              value={ssid ? ssid : ''}
              options={['SSID is not in the list', ...ssids]}
              onChange={({ option }) => {
                toggleSSID(option)
                setSSID(option)
              }}
              margin={"10px"} />
            { ssid === "SSID is not in the list" &&
              <Input m={2} emphasized placeholder='Enter the name of the SSID' value={customSSID ? customSSID : ""} onChange={(e) => {
                setCustSSID(e.target.value) // store
                setCustomSSID(e.target.value) // local state
              }} />
            }
            <Input type="passsword" m={2} emphasized placeholder='Specify password for SSID' value={passwordSSID ? passwordSSID : ""} onChange={(e) => {
              setPassword(e.target.value) // store
              setPasswordSSID(e.target.value) // local state
            }} />
          </div>)
        }
    </Flex>
  </div>
)
}

module.exports = SelectNetwork
