const rendererWindowId = 2;

const IpcFlux = require('../../build/index.js').default;

const ipcFlux = new IpcFlux({
	actions: {
		action1: () => {
			return 'action1 main';
		},
		action2: ({ dispatch }) => {
			return dispatch('local', 'action1');
		},
		action3: ({ dispatch }) => {
			return dispatch(rendererWindowId, 'action1');
		},
		actions3point5: ({}, payload) => {
			return payload;
		},
		action4: ({ dispatch }, payload) => {
			return dispatch('local', 'actions3point5', payload);
		},
		action5: ({ dispatch }, payload) => {
			return dispatch(rendererWindowId, 'action1', payload);
		},
		action6: ({ dispatch }, payload) => {
			return new Promise((resolve) => {
				dispatch(rendererWindowId, 'action1', payload).then((data) => {
					return dispatch('local', 'actions3point5', data);
				}).then((data) => {
					resolve(data + payload);
				});
			});
		},
		chainDispatch: ({ dispatch }) => {
			return dispatch('local', 'chainDispatch1');
		},
		chainDispatch1: ({ dispatch }) => {
			return dispatch('local', 'chainDispatch2');
		},
		chainDispatch2: ({ dispatch }) => {
			return dispatch('local', 'chainDispatch3');
		},
		chainDispatch3: ({ dispatch }) => {
			return 'chain dispatch';
		},
		action7: ({ commit }) => {
			commit('d');
		},
		action8: ({ state }, payload) => {
			return state.a === payload;
		}
	},
	state: {
		a: 1,
		b: 2,
		c: 3
	},
	mutations: {
		d: (state) => {
			state.a = 4;
		}
	}
});

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