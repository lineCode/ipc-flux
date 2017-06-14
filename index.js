import electron from 'electron';

const { ipcMain, ipcRenderer, webContents, remote } = electron;

const channels = {
	call: 'ProcessComms-Call',
	callback: 'ProcessComms-Callback',
	error: 'ProcessComms-Error'
};

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

		const instance = this;

		Object.keys(actions).forEach((action) => {
			this.registerAction(instance, action, actions[action], instance);
		});

		// setup ipc listeners
		if (Process.is('main')) {
			// main ipc listener
			ipcMain.on(channels.call, (event, arg) => {
				const { action, payload } = arg;
				console.log(arg)
				instance.dispatch({ process: arg.process, target: arg.target }, action, payload) //.then((data) => { event.sender.send(channels.callback, data); });
			});

			// main error ipc listener
			ipcMain.on(channels.error, (event, err) => {
				console.error(err);
			});

			// main callback ipc listener
			ipcMain.on(channels.callback, (event, data) => {});
		} else if (Process.is('renderer')) {
			// renderer ipc listener
			ipcRenderer.on(channels.call, (event, arg) => {
				const { action, payload } = arg;
				instance.dispatch({ process: arg.process, target: remote.getCurrentWindow().id }, action, payload) //.then((data) => { event.sender.send(channels.callback, data);});
			});

			// renderer error ipc listener
			ipcRenderer.on(channels.error, (event, err) => {
				console.error(err);
			});

			// renderer callback ipc listener
			ipcRenderer.on(channels.callback, (event, data) => {});
		}

		const { dispatch, dispatchExternal } = this;

		// setup dispatchers
		this.dispatch = function boundDispatch (caller, type, payload) {
			return dispatch.call(instance, caller, type, payload);
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
			if (typeof _target === 'object' || typeof _target === 'number') {} else {
				console.error('target BrowserWindow not passed as parameter');
				return;
			}

			_target = typeof _target === 'object' ? _target.webContents.id : _target

			if (typeof _action !== 'string') {
				console.error('action not passed as parameter');
				return;
			}

			if (typeof _payload !== 'undefined') {
				arg.payload = _payload
			}
			webContents.fromId(_target).send(channels.call, {
				...arg,
				action: _action,
				target: _target
			});
		} else if (Process.is('renderer')) {
			if (typeof _target !== 'string') {
				console.error('action not passed as parameter');
				return;
			}

			if (typeof _action !== 'undefined') {
				arg.payload = _action
			}

			ipcRenderer.send(channels.call, {
				...arg,
				action: _target,
				target: remote.getCurrentWindow().id
			});
		}
	}

	dispatch(_caller, _action, _payload) {
		const { action, payload } = {
			action: _action,
			payload: _payload
		};

		const entry = this._actions[action];

		if (!entry) {
			if (_caller.process === Process.type()) {
				console.error(`unknown action: ${action}`);
			} else {
				if (Process.is('main')) {
					webContents.fromId(_caller.target).send(channels.error, `unknown action: ${action}`)
				} else if (Process.is('renderer')) {
					ipcRenderer.send(channels.error, `unknown action: ${action}`);
				}
			}
			return;
		}

		return entry.length > 1 ? Promise.all(entry.map(handler => handler(payload))) : entry[0](payload);
	}

	registerAction(instance, action, handler, local) {
		const entry = instance._actions[action] || (instance._actions[action] = []);
		entry.push((payload, cb) => {
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