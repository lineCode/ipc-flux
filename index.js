// electron-process-comms

import electron from 'electron';

const { ipcMain, ipcRenderer } = electron;

// determines process originating from
const Process = {
	type: () => {
		// running in browser
		if (typeof process === 'undefined') {
			return 'renderer';
		}

		// node-integration disabled
		if (!process) {
			return 'renderer';
		}

		// node.js
		if (!process.type) {
			return 'main';
		}

		return process.type === 'renderer' ? 'renderer' : 'main';
	},
	is: (type) => {
		if (typeof type === 'string') {
			return type === Process.type();
		} else {
			throw new TypeError('type of `type` was not string');
		}
	}
}

const isPromise = (val) => {
	return val && typeof val.then === 'function';
}

export default class ProcessComms {
	constructor(options = {}) {
		let { actions = {} } = options;

		this._actions = Object.create(null);

		const instance = this
		this.instance = this

		Object.keys(actions).forEach((action) => {
			this.registerAction(instance, action, actions[action], instance);
			this.initListener(instance, action);
		})

		const { dispatch, commit } = this;

		this.dispatch = function boundDispatch (type, payload) {
			return dispatch.call(instance, type, payload);
		}
	}

	initListener(instance, type) {
		if (Process.is('main') === true) {
			ipcMain.on('ProcessComms', (event, arg) => {
				const { action, payload } = arg;
				instance.dispatch(action, payload)  // add .then(() => { event.sender.send('ProcessComms-Reply') })
			});
		} else if (Process.is('renderer') === true) {
			ipcRenderer.on(type, (event, arg) => {
				const { action, payload } = arg;
				instance.dispatch(action, payload) // add .then(() => { event.sender.send('ProcessComms-Reply') })
			});
		}
	}

	send(type, payload) {
		const arg = {
			process: Process.type(),
			action: type,
			payload
		};

		if (Process.is('main') === true) {
			let win; // TEMP
			win.webContents.send('ProcessComms', arg)
		} else if (Process.is('renderer') === true) {
			ipcRenderer.send('ProcessComms', arg)
		}
	}

	dispatch(_type, _payload) {
		const { type, payload } = {
			type: _type,
			payload: _payload
		};

		const entry = this._actions[type];

		if (!entry) {
			console.error(`unknown action type: ${type}`);
			return;
		}

		return entry.length > 1 ? Promise.all(entry.map(handler => handler(payload))) : entry[0](payload);
	}

	registerAction(instance, type, handler, local) {
		const entry = instance._actions[type] || (instance._actions[type] = []);
		entry.push((payload, cb) => {
			let res = handler({
				dispatch: local.dispatch
			}, payload, cb);

			if (!isPromise(res)) {
				res = Promise.resolve(res);
			}

			return res;
		})
	}
}