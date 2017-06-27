//     _                  _____
//    (_)__  ____  ____  / _/ /_ ____ __
//   / / _ \/ __/ /___/ / _/ / // /\ \ /
//  /_/ .__/\__/       /_//_/\_,_//_\_\
//   /_/
//
//	ipc-flux
//
//	github - https://github.com/harryparkdotio/ipc-flux
//	npm - https://www.npmjs.com/package/ipc-flux
//
//	@harryparkdotio - harry@harrypark.io
//
//	MIT license
//

import { ipcMain, ipcRenderer, webContents, BrowserWindow, remote } from 'electron';

import utils from './utils';
const { Process, assert, isPromise } = utils;

// predefined channels
const channels = {
	call: 'IpcFlux-Call',
	callback: 'IpcFlux-Callback',
	error: 'IpcFlux-Error',
	handshake: {
		default: 'IpcFlux-Handshake',
		callback: 'IpcFlux-Handshake-Callback',
		success: 'IpcFlux-Handshake-Success'
	}
};

// remove all active IpcFlux listeners for the current process
const rmListeners = () => {
	const emitter = Process.is('main') ? ipcMain : ipcRenderer;

	Object.values(channels).forEach((channel) => {
		typeof channel === 'object' ? Object.values(channel).forEach((subchannel) => {
			emitter.removeAllListeners(subchannel);
		}) : emitter.removeAllListeners(channel);
	});
}

class IpcFlux {
	constructor(options = {}) {
		if (Process.env.type() !== 'production') {
			// check if Promises can be used
			assert(typeof Promise !== 'undefined', '[IpcFlux] requires Promises to function.');
			assert(this instanceof IpcFlux, '[IpcFlux] must be called with the new operator.');
		}

		// remove IpcFlux listeners
		rmListeners();

		const { actions={}, config={} } = options;

		// defined due to `this` being reassigned in arrow functions
		const instance = this;

		this._actions = Object.create(null);
		this._config = Object.create(null);

		this._config = {
			handshake: {
				timeout: 10000
			},
			...config
		}

		// the listener to be called for actions
		const actionEmitHandler = (event, arg) => {
			if (instance.actionExists(arg.action)) {
				const target = Process.is('renderer') ? remote.getCurrentWindow().id : arg.target;

				const act = dispatch.call(instance, { ...arg, target }, arg.action, arg.payload);

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

		const { dispatch, dispatchExternal } = this;

		this.dispatch = (type, payload) => {
			return dispatch.call(instance, {
				process: Process.type(),
				target: Process.is('renderer') ? remote.getCurrentWindow().id : 0
			}, type, payload);
		}

		this.dispatchExternal = (target, action, payload) => {
			// return a promise of the dispatch, resolving on callback
			dispatchExternal.call(instance, target, action, payload);

			return new Promise((resolve) => {
				// only resolve if the action callback is the same as that called, then remove the callback handler
				const listener = (event, arg) => {
					if (Process.is('renderer') ? arg.action === target : arg.action === action) {
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

		// define the handshake config, specific to the process type
		this.handshake = Process.is('main') ? {
			done: 0,
			total: 0,
			completed: false,
			callbacks_sent: 0,
			targets: [],
			timeout: this._config.handshake.timeout,
			promise: null
		} : {
			completed: false,
			timeout: this._config.handshake.timeout,
			initiated: false,
			callback_received: false,
			promise: null
		}

		// start the handshaking process
		this.beginHandshake();
	}

	beginHandshake() {
		const { handshake } = this;

		if (Process.is('main')) {
			const handshakeListener = (event, arg) => {
				handshake.total += 1;
				// add target to targets, used to determine which handshakes pass/fail
				handshake.targets.push(arg.target);

				// return handshake with target
				event.sender.send(channels.handshake.callback, {
					target: arg.target
				});
			}

			// create a listener, each handshake is initiated from the renderer
			ipcMain.on(channels.handshake.default, handshakeListener);

			const mainHandshakeListener = (event, arg) => {
				// if the target has already been added (initial handshake successful)
				if (handshake.targets.indexOf(arg.target) >= 0) {
					handshake.done += 1;
					handshake.completed = (handshake.done === handshake.total);
				} else {
					console.error('[IpcFlux] handshake return from unknown BrowserWindow id');
				}

				if (handshake.completed) {
					// remove this handshake listener
					ipcMain.removeListener(channels.handshake.success, mainHandshakeListener);
					ipcMain.removeListener(channels.handshake.default, handshakeListener);
				}
			}

			ipcMain.on(channels.handshake.success, mainHandshakeListener);

			handshake.promise = new Promise((resolve, reject) => {
				// called to check if handshakes have been completed
				const handshakeCheck = setInterval(() => {
					handshake.completed = (handshake.done === handshake.total);

					if (handshake.completed) {
						clearInterval(handshakeCheck);
						resolve();
					}
				}, 100 < handshake.timeout ? handshake.timeout / 10 : 100);

				setTimeout(() => {
					clearInterval(handshakeCheck);
					reject();
				}, handshake.timeout);
			}).then(() => {
				// remove all main handshake listeners
				ipcMain.removeAllListeners(channels.handshake.default);
				ipcMain.removeAllListeners(channels.handshake.callback);
				ipcMain.removeAllListeners(channels.handshake.success);

				return true;
			}).catch(() => {
				// remove all main handshake listeners
				ipcMain.removeAllListeners(channels.handshake.default);
				ipcMain.removeAllListeners(channels.handshake.callback);
				ipcMain.removeAllListeners(channels.handshake.success);

				let cause;
				if (handshake.callbacks_sent < handshake.total || handshake.callbacks_sent < handshake.targets.length) {
					cause = 'not all callbacks were returned';
				} else if (handshake.done < handshake.total) {
					cause = 'not all initiated handshakes completed';
				} else {
					cause = 'unknown error';
				}
				// send error to all windows
				webContents.getAllWebContents().forEach((win) => {
					win.send(channels.error, {
						type: 'throw',
						message: `[IpcFlux] handshake failed (timeout): ${err}`
					});
				});
				throw new Error(`[IpcFlux] handshake failed (timeout): ${err}`);
			});
		} else if (Process.is('renderer')) {
			// initiate the handshake
			ipcRenderer.send(channels.handshake.default, {
				target: remote.getCurrentWindow().id
			});
			handshake.initiated = true;

			const rendererHandshakeListener = (event, arg) => {
				if (arg.target === remote.getCurrentWindow().id) {
					handshake.callback_received = true;
					// return the handshake, verifies in main process handshake is complete
					event.sender.send(channels.handshake.success, {
						target: arg.target
					});
					handshake.completed = true;
					// remove this listener
					ipcRenderer.removeListener(channels.handshake.callback, rendererHandshakeListener);

					// remove all renderer handshake listeners
					ipcRenderer.removeAllListeners(channels.handshake.default);
					ipcRenderer.removeAllListeners(channels.handshake.callback);
				}
			}

			ipcRenderer.on(channels.handshake.callback, rendererHandshakeListener);

			handshake.promise = new Promise((resolve, reject) => {
				const handshakeCheck = setInterval(() => {
					if (handshake.done) {
						clearInterval(handshakeCheck);
						resolve();
					}
				}, 100 < handshake.timeout ? handshake.timeout / 10 : 100);

				setTimeout(() => {
					clearInterval(handshakeCheck);
					reject();
				}, handshake.timeout);
			}).then(() => {
				// remove all renderer handshake listeners
				ipcRenderer.removeAllListeners(channels.handshake.default);
				ipcRenderer.removeAllListeners(channels.handshake.callback);
				ipcRenderer.removeAllListeners(channels.handshake.success);
				return true;
			}).catch(() => {
				// remove all renderer handshake listeners
				ipcRenderer.removeAllListeners(channels.handshake.default);
				ipcRenderer.removeAllListeners(channels.handshake.callback);
				ipcRenderer.removeAllListeners(channels.handshake.success);

				let cause;
				if (handshake.initiated === false) {
					cause = 'handshake not initiated';
				} else if (handshake.callback_received === false) {
					cause = 'handshake callback not received';
				} else if (handshake.completed === false) {
					cause = 'handshake was not completed';
				} else {
					cause = 'unknown error';
				}
				throw new Error(`[IpcFlux] handshake failed (timeout): ${cause}`);
			});
		}
	}

	actionExists(action) {
		return !!this._actions[action];
	}

	dispatch(_caller, _action, _payload) {
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

	dispatchExternal(_target, _action, _payload) {
		// same for both process types
		let arg = {
			process: Process.type(),
			callType: 'action'
		};

		let { target, action, payload } = {
			target: _target,
			action: _action,
			payload: _payload
		}

		if (Process.is('main')) {
			// checks target is an instance of BrowserWindow, or if is a BrowserWindow id
			if (typeof target === 'object' || typeof target === 'number') {} else {
				console.error('[IpcFlux] target passed is not instanceof BrowserWindow or an active BrowserWindow\'s id');
				return;
			}

			// converts BrowserWindow or BrowserWindow id to webContents for instance checking
			target = typeof target === 'number' ? webContents.fromId(target) : target.webContents;

			if(!target.webContents) {
				console.error('[IpcFlux] target passed is not an instanceof BrowserWindow or an active BrowserWindow\'s id');
				return;
			}

			if (typeof action !== 'string') {
				console.error('[IpcFlux] action not passed as parameter');
				return;
			}

			webContents.fromId(target.webContents.id).send(channels.call, {
				...arg,
				action,
				payload,
				// send the target BrowserWindow id for callback and error handling
				target: target.webContents.id
			});
		} else if (Process.is('renderer')) {
			// target param is action, and action param is payload because renderer process does not require target BrowserWindow to be passed
			if (typeof target !== 'string') {
				console.error('[IpcFlux] action not passed as parameter');
				return;
			}

			// send a call to the main process to dispatch the action
			ipcRenderer.send(channels.call, {
				...arg,
				action: target,
				payload: action,
				// send the current BrowserWindow id for callback and error handling
				target: remote.getCurrentWindow().id,
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