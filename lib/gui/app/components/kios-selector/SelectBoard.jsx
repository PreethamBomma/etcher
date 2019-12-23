'use strict'

const _ = require('lodash')
const React = require('react')
const utils = require('../../../../shared/utils')
const selectionState = require('../../models/selection-state')
const store = require('../../models/store')
const availableVersions = require('../../models/available-versions')

const getBoards = utils.memoize(availableVersions.getBoards, _.isEqual)

const toggleBoard = (board) => {
  selectionState.selectBoard(board)
}

const SelectBoard = () => {

  const [ boards, setBoards ] = React.useState(getBoards())

  React.useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setBoards(availableVersions.getBoards())
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
      {_.map(boards, (board, index) => {
        return (
          <li
            key={`item-${board}`}
            className="list-group-item"
            onClick={() => toggleBoard(board)}
          >

            <div
              className="list-group-item-section list-group-item-section-expanded"
              tabIndex={ 15 + index }>

            { board }

            </div>
            <span className="list-group-item-section tick tick--success"
              disabled={!selectionState.isBoardSelected(board)}>
            </span>
          </li>
        )
      })}
      {!availableVersions.hasAvailableBoards() && <li className="list-group-item">
        <div>
          <b>Looking for board</b>
          <div>No boards found for this release.</div>
        </div>
      </li>}
    </ul>
  </div>
)
}

module.exports = SelectBoard
