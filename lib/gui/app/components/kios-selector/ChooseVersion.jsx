'use strict'

const _ = require('lodash')
const React = require('react')
const utils = require('../../../../shared/utils')
const selectionState = require('../../models/selection-state')
const store = require('../../models/store')
const availableVersions = require('../../models/available-versions')

const getVersions = utils.memoize(availableVersions.getVersions, _.isEqual)

const toggleVersion = (version) => {
  selectionState.selectVersion(version)
}

const ChooseVersion = () => {

  const [ versions, setVersions ] = React.useState(getVersions())

  React.useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setVersions(availableVersions.getVersions())
    })
    return unsubscribe
  })

  return (<div>
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
          <b>Looking for releases</b>
          <div>No releases for KiOS found.</div>
        </div>
      </li>}
    </ul>
  </div>
)
}

module.exports = ChooseVersion
