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

const _ = require('lodash')
const store = require('./store')

/**
 * @summary Check if there are available drives
 * @function
 * @public
 *
 * @returns {Boolean} whether there are available drives
 *
 * @example
 * if (availableDrives.hasAvailableDrives()) {
 *   console.log('There are available drives!');
 * }
 */
exports.hasAvailableVersions = () => {
  return !_.isEmpty(exports.getVersions())
}

/**
 * @summary Set a list of drives
 * @function
 * @private
 *
 * @param {Object[]} drives - drives
 *
 * @throws Will throw if no drives
 * @throws Will throw if drives is not an array of objects
 *
 * @example
 * availableDrives.setDrives([ ... ]);
 */
exports.setVersions = (versions) => {
  store.dispatch({
    type: store.Actions.SET_AVAILABLE_VERSIONS,
    data: versions
  })
}

/**
 * @summary Get versions
 * @function
 * @private
 *
 * @returns {Object[]} versions
 *
 * @example
 * const version = availableDrives.getVersions();
 */
exports.getVersions = () => {
  return store.getState().toJS().availableVersions
}

/**
 * @summary Get available boards
 * @function
 * @private
 *
 * @returns {Object[]} boards
 *
 * @example
 * const boards = availableDrives.getBoards();
 */
exports.getBoards = () => {
  return store.getState().toJS().availableBoards
}

exports.hasAvailableBoards = () => {
  return !_.isEmpty(exports.getBoards())
}

exports.setAvailableSSIDS = (ssids) => {
  store.dispatch({
    type: store.Actions.SET_AVAILABLE_SSIDS,
    data: ssids
  })
}

exports.getSSIDS = () => {
  return store.getState().toJS().availableSSIDS
}
