const electron = require('electron')

const { app, webContents, BrowserWindow, globalShortcut } = electron;

const path = require('path')
const url = require('url')

let mainWindow

const ProcessComms = require('../build/index.js').default

const processComms = new ProcessComms({
	actions: {
		action1: () => {
			console.log('\n\nmain-process::action1\n\n')
		},
		action2: () => {
			console.log('\n\nmain-process::action2\n\n')
		},
		action3: () => {
			console.log('\n\nmain-process::action3\n\n')
		}
	}
})

function createWindow () {
	mainWindow = new BrowserWindow({
		width: 800,
		height: 600
	})

	mainWindow.loadURL(`file://${__dirname}/index.html`)

	mainWindow.webContents.openDevTools()

	mainWindow.on('closed', function () {
		mainWindow = null
	})

	setTimeout(function() {
		processComms.dispatch('action1')
		processComms.dispatchExternal(mainWindow, 'action6')
	}, 750)
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})

app.on('activate', function () {
	if (mainWindow === null) {
		createWindow()
	}
})