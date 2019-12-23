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

        // Beautify
        let board_beauty = board
        let board_beauty_footer = ""
        if(board == "raspberrypi") {
          board_beauty = "Raspberry Pi 1 (2012-2017)"
          board_beauty_footer = "A, A+, B, B+, Zero (Wireless)"
        } else if(board == "raspberrypi2") {
          board_beauty = "Raspberry Pi 2 (2015)"
          board_beauty_footer = "B"
        } if(board == "raspberrypi3") {
          board_beauty = "Raspberry Pi 3 (2016-2018)"
          board_beauty_footer = "A+, B, B+"
        } if(board == "raspberrypi4") {
          board_beauty = "Raspberry Pi 4 (2019)"
          board_beauty_footer = "B (1GB), B (2GB), B (4GB)"
        }

        return (
          <li
            key={`item-${board}`}
            className="list-group-item"
            onClick={() => toggleBoard(board)}
          >

            <div
              className="list-group-item-section list-group-item-section-expanded"
              tabIndex={ 15 + index }>

            { board_beauty }


            { board_beauty_footer !== "" && <p className="list-group-item-text">
              { board_beauty_footer }
            </p> }

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
