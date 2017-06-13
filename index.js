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

		Object.keys(actions).forEach((action) => {
			this.registerAction(instance, action, actions[action], instance);
		})

		if (Process.is('main') === true) {
			ipcMain.on('ProcessComms', (event, arg) => {
				const { action, payload } = arg;
				instance.dispatch(action, payload)  // add .then(() => { event.sender.send('ProcessComms-Reply') })
			});
		} else if (Process.is('renderer') === true) {
			ipcRenderer.on('ProcessComms', (event, arg) => {
				const { action, payload } = arg;
				instance.dispatch(action, payload) // add .then(() => { event.sender.send('ProcessComms-Reply') })
			});
		}

		const { dispatch, dispatchExternal } = this;

		this.dispatch = function boundDispatch (type, payload) {
			return dispatch.call(instance, type, payload);
		}

		this.dispatchExternal = function boundDispatchExternal(target, action, payload) {
			return dispatchExternal.call(instance, target, action, payload)
		}
	}

	dispatchExternal(_target, _action, _payload) {
		let arg = {
			process: Process.type()
		}

		if (Process.is('main') === true) {
			if (typeof _target !== 'object') {
				console.error('target BrowserWindow not passed as parameter');
				return;
			}

			if (typeof _action !== 'string') {
				console.error('action not passed as parameter');
				return;
			}

			arg.action = _action;

			if (typeof _payload !== 'undefined') {
				arg.payload = _payload
			}

			_target.webContents.send('ProcessComms', arg);
		} else if (Process.is('renderer') === true) {
			if (typeof _target !== 'string') {
				console.error('action not passed as parameter');
				return;
			}

			arg.action = _target;

			if (typeof _action !== 'undefined') {
				arg.payload = _action
			}

			ipcRenderer.send('ProcessComms', arg);
		}
	}

	dispatch(_action, _payload) {
		const { action, payload } = {
			action: _action,
			payload: _payload
		};

		const entry = this._actions[action];

		if (!entry) {
			console.error(`unknown action: ${action}`);
			return;
		}

		return entry.length > 1 ? Promise.all(entry.map(handler => handler(payload))) : entry[0](payload);
	}

	registerAction(instance, action, handler, local) {
		const entry = instance._actions[action] || (instance._actions[action] = []);
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