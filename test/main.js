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