import { ipcMain, ipcRenderer, webContents, remote } from 'electron';

const channels = {
	call: 'ProcessComms-Call',
	callback: 'ProcessComms-Callback',
	error: 'ProcessComms-Error'
};

const assert = (condition, msg) => {
  if (!condition) throw new Error(`[ProcessComms] ${msg}`)
}

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

class ProcessComms {
	constructor(options = {}) {
		if (process.env.NODE_ENV !== 'production') {
			assert(typeof Promise !== 'undefined', 'ProcessComms requires Promises to function.');
			assert(this instanceof ProcessComms, 'ProcessComms must be called with the new operator.');
		}

		let { actions={} } = options;

		const instance = this;

		this._actions = Object.create(null);

		Object.keys(actions).forEach((action) => {
			this.registerAction(action, actions[action]);
		});

		// setup ipc action listeners
		if (Process.is('main')) {
			// main ipc listener
			ipcMain.on(channels.call, (event, arg) => {
				if (instance.actionExists(arg.action)) {
					const act = instance.dispatchAction({ process: arg.process, target: arg.target }, arg.action, arg.payload);

					if (isPromise(act)) {
						act.then((data) => {
							event.sender.send(channels.callback, {
								...arg,
								data
							});
						});
					} else {
						console.log('[ProcessComms] Promise was not returned');
						event.sender.send(channels.callback, {
							...arg
						});
					}
				} else {
					event.sender.send(channels.error, `[ProcessComms] unknown action in main process: ${arg.action}`);
				}
			});

			// main error ipc listener
			ipcMain.on(channels.error, (event, err) => {
				console.error(err);
			});
		} else if (Process.is('renderer')) {
			// renderer ipc listener
			ipcRenderer.on(channels.call, (event, arg) => {
				if (instance.actionExists(arg.action)) {
					const act = instance.dispatchAction({ process: arg.process, target: remote.getCurrentWindow().id }, arg.action, arg.payload);

					if (isPromise(act)) {
						act.then((data) => {
							event.sender.send(channels.callback, {
								...arg,
								target: remote.getCurrentWindow().id,
								data
							});
						});
					} else {
						console.log('[ProcessComms] Promise was not returned');
						event.sender.send(channels.callback, {
							...arg,
							target: remote.getCurrentWindow().id
						});
					}
				} else {
					event.sender.send(channels.error, `[ProcessComms] unknown action in renderer process: ${arg.action}`);
				}
			});

			// renderer error ipc listener
			ipcRenderer.on(channels.error, (event, err) => {
				console.error(err);
			});
		}

		const { dispatchAction, dispatchExternalAction } = this;

		// setup dispatchers
		this.dispatch = function boundDispatch (type, payload) {
			return dispatchAction.call(instance, {
				process: Process.type(),
				target: Process.is('renderer') ? remote.getCurrentWindow().id : null
			}, type, payload);
		}

		this.dispatchExternal = function boundDispatchExternal(target, action, payload) {
			return new Promise((resolve) => {
				dispatchExternalAction.call(instance, target, action, payload);

				if (Process.is('main')) {
					// main callback ipc listener
					return ipcMain.once(channels.callback, (event, arg) => {
						resolve(arg.data);
					});
				} else if (Process.is('renderer')) {
					// renderer callback ipc listener
					return ipcRenderer.once(channels.callback, (event, arg) => {
						resolve(arg.data);
					});
				}
			});
		}
	}

	actionExists(action) {
		return !!this._actions[action];
	}

	dispatchExternalAction(_target, _action, _payload) {
		let arg = {
			process: Process.type()
		}

		if (Process.is('main')) {
			if (typeof _target === 'object' || typeof _target === 'number') {} else {
				console.error('[ProcessComms] target BrowserWindow not passed as parameter');
				return;
			}

			_target = typeof _target === 'object' ? _target.webContents.id : _target

			if (typeof _action !== 'string') {
				console.error('[ProcessComms] action not passed as parameter');
				return;
			}

			if (typeof _payload !== 'undefined') {
				arg.payload = _payload;
			}
			webContents.fromId(_target).send(channels.call, {
				...arg,
				action: _action,
				target: _target
			});
		} else if (Process.is('renderer')) {
			if (typeof _target !== 'string') {
				console.error('[ProcessComms] action not passed as parameter');
				return;
			}

			if (typeof _action !== 'undefined') {
				arg.payload = _action;
			}

			ipcRenderer.send(channels.call, {
				...arg,
				action: _target,
				target: remote.getCurrentWindow().id
			});
		}
	}

	dispatchAction(_caller, _action, _payload) {
		const { action, payload } = {
			action: _action,
			payload: _payload
		};

		const entry = this._actions[action];

		// if no action was found
		if (!entry) {
			// show the error in the log from where it was called from
			if (_caller.process === Process.type()) {
				console.error(`[ProcessComms] unknown action: ${action}`);
			}
			return;
		}

		// return a promise of the action, passing in the payload
		return entry.length > 1 ? Promise.all(entry.map(handler => handler(payload))) : entry[0](payload);
	}

	registerAction(action, handler) {
		const instance = this;

		const entry = Array.isArray(instance._actions[action]) ? instance._actions[action] : instance._actions[action] = [];

		entry.push((payload, cb) => {
			let res = handler({
				dispatch: instance.dispatch,
				dispatchExternal: instance.dispatchExternal
			}, payload, cb);

			if (!isPromise(res)) {
				res = Promise.resolve(res);
			}

			return res;
		})
	}
}

export default ProcessComms