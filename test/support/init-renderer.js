const { app, BrowserWindow } = require('electron');

let win = null;

function createWindow () {
	win = new BrowserWindow({
		width: 100,
		height: 100,
		show: false
	});

	win.loadURL(`file://${__dirname}/index.html`);

	win.on('closed', function () {
		win = null;
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
	if (win === null) {
		createWindow();
	}
});