'use strict'

const _ = require('lodash')
const React = require('react')
const utils = require('../../../../shared/utils')
const selectionState = require('../../models/selection-state')
const store = require('../../models/store')
const availableVersions = require('../../models/available-versions')
const { Select, Input, Flex } = require('rendition')

const toggleNetworkConfig = (networkconfig) => {
  selectionState.selectNetworkConfig(networkconfig)
}

const setStoreIP = (ip) => {
  selectionState.selectIP(ip)
}

const setStoreGateway = (gateway) => {
  selectionState.selectGateway(gateway)
}

const setStoreDNS = (dns) => {
  selectionState.selectDNS(dns)
}

const SetNetworkConfiguration = () => {

  const [networkconfig, setNetworkConfig] = React.useState(selectionState.getSelectedNetworkConfig());
  const [ip, setIP] = React.useState(selectionState.getSelectedIP());
  const [gateway, setGateway] = React.useState(selectionState.getSelectedGateway());
  const [dns, setDNS] = React.useState(selectionState.getSelectedDNS());

  return (<div>
    <Flex flexDirection="column">
      <Select
        placeholder='Which network configuration do you want?'
        options={['Dynamic IP', 'Static IP']}
        value={networkconfig ? networkconfig : ''}
        onChange={({ option }) => {
          toggleNetworkConfig(option)
          setNetworkConfig(option)
        }}
        margin={"10px"}/>
        { networkconfig === 'Static IP' && ( <div>
            <Input m={2} emphasized placeholder='Enter the IP address you want' value={ip ? ip : ""} onChange={(e) => {
              setIP(e.target.value) // store
              setStoreIP(e.target.value) // local state
            }} />
            <Input m={2} emphasized placeholder='Enter the IP address of your gateway' value={gateway ? gateway : ""} onChange={(e) => {
              setGateway(e.target.value) // store
              setStoreGateway(e.target.value) // local state
            }} />
            <Input type="passsword" m={2} emphasized placeholder='Enter the DNS' value={dns ? dns : ""} onChange={(e) => {
              setDNS(e.target.value) // store
              setStoreDNS(e.target.value) // local state
            }} />
          </div>)
        }
    </Flex>
  </div>
)
}

module.exports = SetNetworkConfiguration
