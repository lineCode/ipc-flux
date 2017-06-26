const electron = require('electron');

const { app, webContents, BrowserWindow } = electron;

const path = require('path');
const url = require('url');

let mainWindow;

const IpcFlux = require('../build/index.js').default;
const ipcFlux = new IpcFlux({
	actions: {
		action1: () => {
			return 'action1 main';
		},
		action2: ({ dispatch }) => {
			return dispatch('action1');
		},
		action3: ({ dispatchExternal }) => {
			return dispatchExternal(2, 'action1');
		},
		actions3point5: ({}, payload) => {
			return payload;
		},
		action4: ({ dispatch }, payload) => {
			return dispatch('actions3point5', payload);
		},
		action5: ({ dispatchExternal }, payload) => {
			return dispatchExternal(2, 'action1', payload);
		},
		action6: ({ dispatch, dispatchExternal }, payload) => {
			return new Promise((resolve) => {
				dispatchExternal(2, 'action1', payload).then((data) => {
					return dispatch('actions3point5', data);
				}).then((data) => {
					resolve(data + payload);
				});
			});
		}
	}
});

function createWindow () {
	mainWindow = new BrowserWindow({
		width: 800,
		height: 600
	});

	mainWindow.loadURL(`file://${__dirname}/index.html`);

	mainWindow.on('closed', function () {
		mainWindow = null
	});
}

app.on('ready', () => {
	createWindow();
});

app.on('window-all-closed', function () {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', function () {
	if (mainWindow === null) {
		createWindow();
	}
});