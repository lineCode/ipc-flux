import { ipcMain, ipcRenderer, webContents, remote } from 'electron';

import utils from './utils';
const { Process, assert, isPromise } = utils;

// predefined channels
const channels = {
	call: 'IpcFlux-Call',
	callback: 'IpcFlux-Callback',
	error: 'IpcFlux-Error',
	handshake: 'IpcFlux-Handshake',
	handshake_return: 'IpcFlux-HandshakeReturn'
};

// remove all active IpcFlux listeners for the current process
const rmListeners = () => {
	const emitter = Process.is('main') ? ipcMain : ipcRenderer;

	Object.values(channels).forEach((channel) => {
		emitter.removeAllListeners(channel);
	});
}

class IpcFlux {
	constructor(options = {}) {
		if (Process.env.type() !== 'production') {
			// check if Promises can be used
			assert(typeof Promise !== 'undefined', 'IpcFlux requires Promises to function.');
			assert(this instanceof IpcFlux, 'IpcFlux must be called with the new operator.');
		}

		// remove IpcFlux listeners
		rmListeners();

		const { actions={}, config={} } = options;

		this.config = {
			handshake: {
				timeout: 10000
			},
			...config
		}

		// defined due to `this` being reassigned in arrow functions
		const instance = this;

		this._actions = Object.create(null);

		// the listener to be called for actions
		const actionEmitHandler = (event, arg) => {
			if (instance.actionExists(arg.action)) {
				const target = Process.is('renderer') ? remote.getCurrentWindow().id : arg.target;

				const act = instance.dispatchAction({ ...arg, target }, arg.action, arg.payload);

				if (isPromise(act)) {
					// on Promise complete, send a callback to the dispatcher
					act.then((data) => {
						event.sender.send(channels.callback, {
							...arg,
							target,
							data
						});
					});
				} else {
					// send a callback to the dispatcher
					event.sender.send(channels.error, `[IpcFlux] '${arg.action}' action called from ${arg.process} process, in ${Process.type()} process, did not return a Promise`);
					event.sender.send(channels.callback, {
						...arg,
						target
					});
				}
			} else {
				// if the action doesn't exist, send an error message back to the caller
				event.sender.send(channels.error, `[IpcFlux] unknown action called from ${arg.process} process, in ${Process.type()} process: ${arg.action}`);
			}
		}

		// run on `channel.call`
		const emitterCallListener = (event, arg) => {
			if (typeof arg !== 'object') {
				return;
			}

			switch(arg.callType) {
				// if the call type is an action, let `actionEmitHandler` handle it
				case 'action':
					actionEmitHandler(event, arg);
					break;
			}
		}

		// define the process emitter, minimizes code duplication
		const emitter = Process.is('main') ? ipcMain : ipcRenderer;

		// the emitter event handlers for calls and errors
		emitter.on(channels.call, emitterCallListener);
		emitter.on(channels.error, (event, err) => {
			if (typeof err === 'object') {
				if (err.type === 'throw') {
					throw new Error(err.message);
				} else if (err.type === 'console' || err.type === 'error') {
					console.error(err.message);
				} else if (err.type === 'warn') {
					console.warn(err.message);
				} else if (err.type === 'log') {
					console.log(err.message);
				}
			} else {
				console.error(err);
			}
		});

		const { dispatchAction, dispatchExternalAction } = this;

		this.dispatch = (type, payload) => {
			return dispatchAction.call(instance, {
				process: Process.type(),
				target: Process.is('renderer') ? remote.getCurrentWindow().id : null
			}, type, payload);
		}

		this.dispatchExternal = (target, action, payload) => {
			// return a promise of the dispatch, resolving on callback
			return new Promise((resolve) => {
				dispatchExternalAction.call(instance, target, action, payload);

				// only resolve if the action callback is the same as that called, then remove the callback handler
				const listener = (event, arg) => {
					if (arg.action === action) {
						emitter.removeListener(channels.callback, listener);
						resolve(arg.data);
					}
				}

				// setup a callback listener
				emitter.on(channels.callback, listener);
			});
		}

		// register all actions defined in the class constructor options
		Object.keys(actions).forEach((action) => {
			this.registerAction(action, actions[action]);
		});

		this.debug = {
			process: Process.type(),
			channels
		}

		this.handshake = Process.is('main') ? { done: 0, total: 0, completed: false, targets: [], timeout: this.config.handshake.timeout } : { completed: false }

		this.beginHandshake();
	}

	beginHandshake() {
		const { handshake } = this;

		if (Process.is('main')) {
			const handshakeListener = (event, arg) => {
				handshake.total += 1;
				handshake.targets.push(arg.target);

				event.sender.send(channels.handshake_return, {
					target: arg.target
				});
			}

			ipcMain.on(channels.handshake, handshakeListener);

			const mainHandshakeListener = (event, arg) => {
				if (handshake.targets.indexOf(arg.target) >= 0) {
					handshake.done += 1;
					handshake.completed = (handshake.done === handshake.total);
				} else {
					console.error('[IpcFlux] handshake return from unknown BrowserWindow id');
				}

				if (handshake.completed) {
					ipcMain.removeListener(channels.handshake_return, mainHandshakeListener);
					ipcMain.removeListener(channels.handshake, handshakeListener);
				}
			}

			ipcMain.on(channels.handshake_return, mainHandshakeListener);

			setTimeout(() => {
				if (!handshake.completed) {
					webContents.getAllWebContents().forEach((win) => {
						win.send(channels.error, {
							type: 'throw',
							message: `[IpcFlux] handshake did not completed within set timeout of ${handshake.timeout}ms (${handshake.timeout / 1000}s)`
						});
					});
					throw new Error(`[IpcFlux] handshake did not completed within set timeout of ${handshake.timeout}ms (${handshake.timeout / 1000}s)`);
				}

				ipcMain.removeAllListeners(channels.handshake);
				ipcMain.removeAllListeners(channels.handshake_return);
			}, handshake.timeout);
		} else if (Process.is('renderer')) {
			ipcRenderer.send(channels.handshake, {
				process: Process.type(),
				target: remote.getCurrentWindow().id
			});

			const rendererHandshakeListener = (event, arg) => {
				if (arg.target === remote.getCurrentWindow().id) {
					event.sender.send(channels.handshake_return, {
						target: arg.target
					});
					handshake.completed = true;
					ipcRenderer.removeListener(channels.handshake_return, rendererHandshakeListener);

					ipcRenderer.removeAllListeners(channels.handshake);
					ipcRenderer.removeAllListeners(channels.handshake_return);
				}
			}

			ipcRenderer.on(channels.handshake_return, rendererHandshakeListener);
		}
	}

	actionExists(action) {
		return !!this._actions[action];
	}

	dispatchAction(_caller, _action, _payload) {
		const { action, payload } = {
			action: _action,
			payload: _payload
		};

		const entry = this._actions[action];

		// if no action was found
		if (!entry) {
			// action was dispatched from this process, show the error in this process
			if (_caller.process === Process.type()) {
				console.error(`[IpcFlux] unknown action: ${action}`);
			}
			// action existence is checked in `actionListener` above, as we don't know the actions defined in the other process
			return;
		}

		// return a promise of the action function, async
		return entry.length > 1 ? Promise.all(entry.map(handler => handler(payload))) : entry[0](payload);
	}

	dispatchExternalAction(_target, _action, _payload) {
		// same for both process types
		let arg = {
			process: Process.type(),
			callType: 'action'
		};

		if (Process.is('main')) {
			// checks target is an instance of BrowserWindow, or if is a BrowserWindow id
			if (typeof _target === 'object' || typeof _target === 'number') {} else {
				console.error('[IpcFlux] target passed is not instanceof BrowserWindow or an active BrowserWindow\'s id');
				return;
			}

			// converts BrowserWindow or BrowserWindow id to webContents for instance checking
			_target = typeof _target === 'number' ? webContents.fromId(_target) : webContents in _target ? _target.webContents : {}

			if(!(_target instanceof webContents)) {
				console.error('[IpcFlux] target passed is not an instanceof BrowserWindow or an active BrowserWindow\'s id');
				return;
			}

			if (typeof _action !== 'string') {
				console.error('[IpcFlux] action not passed as parameter');
				return;
			}

			// add the payload to `arg` if not undefined
			if (typeof _payload !== 'undefined') {
				arg.payload = _payload;
			}
			webContents.fromId(_target.webContents.id).send(channels.call, {
				...arg,
				action: _action,
				// send the target BrowserWindow id for callback and error handling
				target: _target.webContents.id
			});
		} else if (Process.is('renderer')) {
			// _target param is action, and _action param is payload because renderer process does not require target BrowserWindow to be passed
			const { _action, _payload } = {
				_action: _target,
				_payload: _action
			};

			if (typeof _action !== 'string') {
				console.error('[IpcFlux] action not passed as parameter');
				return;
			}

			// add the payload to `arg` if not undefined
			if (typeof _payload !== 'undefined') {
				arg.payload = _payload;
			}

			// send a call to the main process to dispatch the action
			ipcRenderer.send(channels.call, {
				...arg,
				action: _action,
				// send the current BrowserWindow id for callback and error handling
				target: remote.getCurrentWindow().id
			});
		}
	}

	registerAction(action, handler) {
		const instance = this;

		// checks if action is in `_actions` array, if not, create an array at the required key
		const entry = Array.isArray(instance._actions[action]) ? instance._actions[action] : instance._actions[action] = [];

		// add the action to the array
		// note that this allows actions to be created using the same action_name, but with different handlers without being overwritten
		entry.push((payload, cb) => {
			// add the handler to `_actions`, passing in { dispatch, dispatchExternal } for use within the action, as well as the payload and callback
			let res = handler({
				dispatch: instance.dispatch,
				dispatchExternal: instance.dispatchExternal
			}, payload, cb);

			// if not already a Promise, make it one
			if (!isPromise(res)) {
				res = Promise.resolve(res);
			}

			return res;
		});
	}
}

export default IpcFlux