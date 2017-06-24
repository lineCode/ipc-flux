const electron = require('electron');

const { app, webContents, BrowserWindow } = electron;

const path = require('path');
const url = require('url');

const { expect, should, assert } = require('chai');

const IpcFlux = require('../build/index.js').default;

let mainWindow;

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

describe('IpcFlux - main process', () => {
	it('instance successfully created on `new`', () => {
		const ipcFlux = new IpcFlux();

		expect(ipcFlux instanceof IpcFlux).to.be.true;
	});

	it('registerAction works', () => {
		const ipcFlux = new IpcFlux();

		ipcFlux.registerAction('action1', () => {
			return 'action1';
		});

		ipcFlux.dispatch('action1').then((data) => {
			expect(data).to.equal('action1');
		});
	});

	it('local dispatch works', () => {
		const ipcFlux = new IpcFlux({
			actions: {
				action1: () => {
					return 'action1';
				}
			}
		});

		ipcFlux.dispatch('action1').then((data) => {
			expect(data).to.equal('action1');
		});
	});

	it('local dispatch with dispatcher works', () => {
		const ipcFlux = new IpcFlux({
			actions: {
				action1: ({ dispatch }) => {
					return dispatch('action2')
				},
				action2: () => {
					return 'action2';
				}
			}
		});

		ipcFlux.dispatch('action1').then((data) => {
			expect(data).to.equal('action2');
		});
	});

	it('local dispatch with payload works', () => {
		const ipcFlux = new IpcFlux({
			actions: {
				action1: ({}, payload) => {
					return payload;
				}
			}
		});

		ipcFlux.dispatch('action1', 'hello').then((data) => {
			expect(data).to.equal('hello');
		});
	});

	it('local dispatch with dispatcher and payload works', () => {
		const ipcFlux = new IpcFlux({
			actions: {
				action1: ({ dispatch }, payload) => {
					return dispatch('action2', payload);
				},
				action2: ({}, payload) => {
					return payload;
				}
			}
		});

		ipcFlux.dispatch('action1', 'hello').then((data) => {
			expect(data).to.equal('hello');
		});
	});
});