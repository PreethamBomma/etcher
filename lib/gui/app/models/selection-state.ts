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

import * as _ from 'lodash';

import * as availableDrives from './available-drives';
import { Actions, store } from './store';

/**
 * @summary Select a drive by its device path
 */
export function selectDrive(driveDevice: string) {
	store.dispatch({
		type: Actions.SELECT_DRIVE,
		data: driveDevice,
	});
}

/**
 * @summary Toggle drive selection
 */
export function toggleDrive(driveDevice: string) {
	if (isDriveSelected(driveDevice)) {
		deselectDrive(driveDevice);
	} else {
		selectDrive(driveDevice);
	}
}

export function selectImage(image: any) {
	store.dispatch({
		type: Actions.SELECT_IMAGE,
		data: image,
	});
}

/**
 * @summary Get all selected drives' devices
 */
export function getSelectedDevices(): string[] {
	return store
		.getState()
		.getIn(['selection', 'devices'])
		.toJS();
}

/**
 * @summary Get all selected drive objects
 */
export function getSelectedDrives(): any[] {
	const drives = availableDrives.getDrives();
	return _.map(getSelectedDevices(), device => {
		return _.find(drives, { device });
	});
}

/**
 * @summary Get the selected image
 */
export function getImage() {
	return _.get(store.getState().toJS(), ['selection', 'image']);
}

export function getImagePath(): string {
	return _.get(store.getState().toJS(), ['selection', 'image', 'path']);
}

export function getImageSize(): number {
	return _.get(store.getState().toJS(), ['selection', 'image', 'size']);
}

export function getImageUrl(): string {
	return _.get(store.getState().toJS(), ['selection', 'image', 'url']);
}

export function getImageName(): string {
	return _.get(store.getState().toJS(), ['selection', 'image', 'name']);
}

export function getImageLogo(): string {
	return _.get(store.getState().toJS(), ['selection', 'image', 'logo']);
}

export function getImageSupportUrl(): string {
	return _.get(store.getState().toJS(), ['selection', 'image', 'supportUrl']);
}

export function getImageRecommendedDriveSize(): number {
	return _.get(store.getState().toJS(), [
		'selection',
		'image',
		'recommendedDriveSize',
	]);
}

/**
 * @summary Check if there is a selected drive
 */
export function hasDrive(): boolean {
	return Boolean(getSelectedDevices().length);
}

/**
 * @summary Check if there is a selected image
 */
export function hasImage(): boolean {
	return Boolean(getImage());
}

/**
 * @summary Remove drive from selection
 */
export function deselectDrive(driveDevice: string) {
	store.dispatch({
		type: Actions.DESELECT_DRIVE,
		data: driveDevice,
	});
}

export function deselectImage() {
	store.dispatch({
		type: Actions.DESELECT_IMAGE,
	});
}

export function deselectAllDrives() {
	_.each(getSelectedDevices(), deselectDrive);
}

/**
 * @summary Clear selections
 */
export function clear() {
	deselectImage();
	deselectAllDrives();
}

/**
 * @summary Check whether a given device is selected.
 */
export function isDriveSelected(driveDevice: string) {
	if (!driveDevice) {
		return false;
	}

	const selectedDriveDevices = getSelectedDevices();
	return _.includes(selectedDriveDevices, driveDevice);
}

export function getSelectedVersion() {
	return _.get(store.getState().toJS(), ['selection', 'version']);
}

export function hasVersion() {
	return !_.isEmpty(getSelectedVersion());
}

export function isVersionSelected(version: any) {
	if (!version) {
		return false;
	}
	const selectedVersion = getSelectedVersion();
	return selectedVersion.assets_url === version.assets_url;
}

export function selectVersion(version: any) {
	store.dispatch({
		type: Actions.SELECT_VERSION,
		data: version,
	});
}

export function hasBoard() {
	return !_.isEmpty(getSelectedBoard());
}

export function getSelectedBoard() {
	return _.get(store.getState().toJS(), ['selection', 'board']);
}

export function selectBoard(board: string) {
	store.dispatch({
		type: Actions.SELECT_BOARD,
		data: board,
	});
}

export function isBoardSelected(board: string) {
	if (!board) {
		return false;
	}
	const b = getSelectedBoard();
	return b === board;
}

export function hasConnection() {
	const connection = getSelectedConnection();
	if (connection) {
		if (connection === 'Wireless') {
			const ssid = getSelectedSSID();
			if (ssid && ssid !== '') {
				if (ssid === 'SSID is not in the list') {
					const customSsid = getCustomSSID();
					const passwordSsid = getPasswordSSID();
					return (
						customSsid &&
						customSsid !== '' &&
						passwordSsid &&
						passwordSsid !== ''
					);
				} else {
					const passwordSsid = getPasswordSSID();
					return passwordSsid && passwordSsid !== '';
				}
			}
			return false;
		}
		return true;
	}
	return false;
}

export function selectConnection(connection: string) {
	store.dispatch({
		type: Actions.SELECT_CONNECTION,
		data: connection,
	});
}

export function getSelectedConnection() {
	return _.get(store.getState().toJS(), ['selection', 'connection']);
}

export function getSelectedSSID() {
	return _.get(store.getState().toJS(), ['selection', 'ssid']);
}

export function selectSSID(ssid: string) {
	store.dispatch({
		type: Actions.SELECT_SSID,
		data: ssid,
	});
}

export function getCustomSSID() {
	return _.get(store.getState().toJS(), ['selection', 'custom_ssid']);
}

export function setCustomSSID(ssid: string) {
	store.dispatch({
		type: Actions.SET_CUSTOM_SSID,
		data: ssid,
	});
}

export function getPasswordSSID() {
	return _.get(store.getState().toJS(), ['selection', 'password']);
}

export function setPassword(password: string) {
	store.dispatch({
		type: Actions.SET_PASSWORD_SSID,
		data: password,
	});
}

export function selectNetworkConfig(networkconfig: string) {
	store.dispatch({
		type: Actions.SELECT_NETWORK_CONFIG,
		data: networkconfig,
	});
}

export function getSelectedNetworkConfig() {
	return _.get(store.getState().toJS(), ['selection', 'network_config']);
}

export function selectIP(ip: string) {
	store.dispatch({
		type: Actions.SELECT_IP,
		data: ip,
	});
}

export function getSelectedIP() {
	return _.get(store.getState().toJS(), ['selection', 'ip_address']);
}

export function selectGateway(gateway: string) {
	store.dispatch({
		type: Actions.SELECT_GATEWAY,
		data: gateway,
	});
}

export function getSelectedGateway() {
	return _.get(store.getState().toJS(), ['selection', 'ip_gateway']);
}

export function selectDNS(dns: string) {
	store.dispatch({
		type: Actions.SELECT_DNS,
		data: dns,
	});
}

export function getSelectedDNS() {
	return _.get(store.getState().toJS(), ['selection', 'ip_dns']);
}

export function hasNetworkConfig() {
	const networkConfig = getSelectedNetworkConfig();
	if (networkConfig) {
		if (networkConfig === 'Static IP') {
			const ip = getSelectedIP();
			const gateway = getSelectedGateway();
			const dns = getSelectedDNS();
			return ip && ip !== '' && gateway && gateway !== '' && dns && dns !== '';
		}
		return true;
	}
	return false;
}
