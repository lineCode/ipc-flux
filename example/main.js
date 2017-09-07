const electron = require('electron');

const { app, webContents, BrowserWindow, globalShortcut } = electron;

const path = require('path');
const url = require('url');

let mainWindows = [];

const IpcFlux = require('../build/index.js').default;

const ipcFlux = new IpcFlux({
	actions: {
		action1: ({ dispatch }) => {
			dispatch(2, 'action2');
		},
		action2: ({ dispatch }) => {
			dispatch(1, 'action2');
		}
	}
});

function createWindow (d) {
	mainWindows[d] = new BrowserWindow({
		width: 100,
		height: 100,
		acceptFirstMouse: true,
		x: d === 0 ? 50 : 150,
		y: 50
	});

	d === 0 ? mainWindows[d].loadURL(`file://${__dirname}/index.html`) : mainWindows[d].loadURL(`file://${__dirname}/index-2.html`);

	// mainWindows[d].webContents.openDevTools()

	mainWindows[d].on('closed', function () {
		mainWindows[d] = null;
	});
}

app.on('ready', () => {
	createWindow(0);
	createWindow(1);
});

app.on('window-all-closed', function () {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', function () {
	if (mainWindows[0] === null) {
		createWindow();
	}
});