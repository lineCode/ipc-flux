import electron from 'electron';

const { ipcMain, ipcRenderer } = electron;

// determines process originating from
const Process = {
	// return the type of process as a string
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
	// explicit type checking
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

		// setup ipc listeners
		if (Process.is('main')) {
			// main ipc listener
			ipcMain.on('ProcessComms', (event, arg) => {
				const { action, payload } = arg;
				instance.dispatch(action, payload)  // add .then(() => { event.sender.send('ProcessComms-Reply') })
			});

			// main error ipc listener
			ipcMain.on('ProcessComms-Error', (event, err) => {
				console.error(err)
			});
		} else if (Process.is('renderer')) {
			// renderer ipc listener
			ipcRenderer.on('ProcessComms', (event, arg) => {
				const { action, payload } = arg;
				instance.dispatch(action, payload) // add .then(() => { event.sender.send('ProcessComms-Reply') })
			});

			// renderer error ipc listener
			ipcRenderer.on('ProcessComms-Error', (event, err) => {
				console.error(err)
			});
		}

		const { dispatch, dispatchExternal } = this;

		// setup dispatchers
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

		if (Process.is('main')) {
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
		} else if (Process.is('renderer')) {
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
			// flip, pops in other process!
			let res = handler({
				dispatch: local.dispatch,
				dispatchExternal: local.dispatchExternal
			}, payload, cb);

			if (!isPromise(res)) {
				res = Promise.resolve(res);
			}

			return res;
		})
	}
}