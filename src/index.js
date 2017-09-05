//
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
//

import { ipcMain, ipcRenderer, webContents, remote } from 'electron';

import utils from './utils';

const { Process, assert, isPromise } = utils;

// predefined channels
const channels = {
	call: 'IpcFlux-Call',
	callback: 'IpcFlux-Callback',
	error: 'IpcFlux-Error',
	state: 'IpcFlux-State'
};

// remove all existing IpcFlux listeners
const rmListeners = () => {
	const emitter = Process.is('main') ? ipcMain : ipcRenderer;

	Object.values(channels).forEach(channel => {
		emitter.removeAllListeners(channel);
	});
};

class IpcFlux {
	constructor(options = {}) {
		if (Process.env.type() !== 'production') {
			// check if Promises can be used
			assert(typeof Promise === 'undefined', 'Promises are required');
		}

		// remove IpcFlux listeners
		rmListeners();

		const { actions = {}, mutations = {}, getters = {}, config = {} } = options;

		let { state } = options;

		assert((state !== undefined || (typeof state === 'object' && Object.keys(state).length > 0)) && Process.is('renderer'), 'initial state must be declared in main process');

		if (Process.is('main')) {
			state = state || {};
		}

		// defined due to `this` being reassigned in arrow functions (grr)
		const instance = this;

		this._committing = false;
		this._actions = Object.create(null);
		this._mutations = Object.create(null);
		this._getters = Object.create(null);
		this._subscribers = [];

		this._config = Object.create(null);

		this._config = {
			maxListeners: 50,
			debug: false,
			...config
		};

		// the listener to be called for actions
		const actionEmitHandler = (event, arg) => {
			if (instance.actionExists(arg.action)) {
				const target = Process.is('renderer') ? remote.getCurrentWindow().id : arg.target;

				const act = dispatch.call(instance, { ...arg, target }, arg.action, arg.payload);

				if (isPromise(act)) {
					// on Promise complete, send a callback to the dispatcher
					act.then(data => {
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
		};

		const mutationEmitHandler = (event, arg) => {
			if (instance.mutationExists(arg.mutation)) {
				const target = Process.is('renderer') ? remote.getCurrentWindow().id : arg.target;

				commit.call(instance, { ...arg, target }, arg.mutation, arg.payload);
			}
		};

		// run on `channel.call`
		const emitterCallListener = (event, arg) => {
			if (typeof arg !== 'object') {
				return;
			}

			switch (arg.callType) {
			// if the call type is an action, let `actionEmitHandler` handle it
			case 'action':
				actionEmitHandler(event, arg);
				break;
			case 'mutation':
				mutationEmitHandler(event, arg);
				break;
			default:
				break;
			}
		};

		// define the process emitter, minimizes code duplication
		const emitter = Process.is('main') ? ipcMain : ipcRenderer;

		emitter.setMaxListeners(this._config.maxListeners);

		// the emitter event handlers for calls and errors
		emitter.on(channels.call, emitterCallListener);

		emitter.on(channels.error, (event, err) => {
			if (typeof err === 'object') {
				switch (err.type) {
				case 'throw':
					throw new Error(err.message);
				case 'warn':
					console.warn(err.message);
					break;
				case 'warning':
					console.warn(err.message);
					break;
				case 'log':
					console.log(err.message);
					break;
				default:
					console.error(err.message);
					break;
				}
			} else {
				console.error(err);
			}
		});

		const { dispatch, dispatchExternal, commit, commitExternal } = this;

		this.dispatch = (type, payload) => {
			return dispatch.call(instance, {
				process: Process.type(),
				target: Process.is('renderer') ? remote.getCurrentWindow().id : 0
			}, type, payload);
		};

		this.dispatchExternal = (target, action, payload) => {
			// return a promise of the dispatch, resolving on callback
			dispatchExternal.call(instance, target, action, payload);

			return new Promise((resolve, reject) => {
				// only resolve if the action callback is the same as that called, then remove the callback handler
				const listener = (event, arg) => {
					if (Process.is('renderer') ? arg.action === target : arg.action === action) {
						emitter.removeListener(channels.callback, listener);
						resolve(arg.data);
					} else {
						reject();
					}
				};

				// setup a callback listener
				emitter.on(channels.callback, listener);
			});
		};

		this.commit = (mutation, payload, options) => {
			commit.call(instance, mutation, payload, options);
		};

		this.commitExternal = (target, mutation, payload, options) => {
			// return a promise of the dispatch, resolving on callback
			commitExternal.call(instance, target, mutation, payload, options);
		};

		// register all actions defined in the class constructor options
		Object.keys(actions).forEach(action => {
			this.registerAction(action, actions[action]);
		});

		// register all mutations defined in the class constructor options
		Object.keys(mutations).forEach(mutation => {
			this.registerMutation(mutation, mutations[mutation]);
		});

		// register all getters defined in the class constructor options
		Object.keys(getters).forEach(getter => {
			this.registerGetter(getter, getters[getter]);
		});

		this.debug = {
			process: Process.type(),
			channels
		};
	}

	actionExists(action) {
		return Boolean(this._actions[action]);
	}

	mutationExists(mutation) {
		return Boolean(this._mutations[mutation]);
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

		// return a promise of the action function
		return entry.length > 1 ? Promise.all(entry.map(handler => handler(payload))) : entry[0](payload);
	}

	dispatchExternal(_target, _action, _payload) {
		// same for both process types
		const arg = {
			process: Process.type(),
			callType: 'action'
		};

		let { target, action, payload } = {
			target: _target,
			action: _action,
			payload: _payload
		};

		if (Process.is('main')) {
			// checks target is an instance of BrowserWindow, or if is a BrowserWindow id
			if (typeof target !== 'object' && typeof target !== 'number') {
				console.error('[IpcFlux] target passed is not instanceof BrowserWindow or an active BrowserWindow\'s id');
				return;
			}

			// converts BrowserWindow or BrowserWindow id to webContents for instance checking
			target = typeof target === 'number' ? webContents.fromId(target) : target.webContents;

			if (!target.webContents) {
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
				target: remote.getCurrentWindow().id
			});
		}
	}

	commit(_type, _payload, _options) {
		const instance = this;

		let { type, payload, options } = {
			type: _type,
			payload: _payload,
			options: _options
		};

		const mutation = { type, payload };
		const entry = this._mutations[type];

		if (!entry) {
			console.error(`[IpcFlux] unknown mutation type: ${type}`);
			return;
		}

		instance._withCommit(() => {
			entry.forEach(handler => {
				handler(payload);
			});
		});

		this._subscribers.forEach(sub => sub(mutation, this.state));
	}

	commitExternal(_target, _mutation, _payload, _options) {
		const instance = this;

		const arg = {
			process: Process.type(),
			callType: 'mutation'
		};

		let { target, mutation, payload, options } = {
			target: _target,
			mutation: _mutation,
			payload: _payload,
			options: _options
		};

		if (Process.is('main')) {
			if (typeof target !== 'object' && typeof target !== 'number') {
				console.error('[IpcFlux] target passed is not instanceof BrowserWindow or an active BrowserWindow\'s id');
				return;
			}

			target = typeof target === 'number' ? webContents.fromId(target) : target.webContents;

			if (!target.webContents) {
				console.error('[IpcFlux] target passed is not an instanceof BrowserWindow or an active BrowserWindow\'s id');
				return;
			}

			if (typeof mutation !== 'string') {
				console.error('[IpcFlux] mutation not passed as parameter');
				return;
			}

			webContents.fromId(target.webContents.id).send(channels.call, {
				...arg,
				mutation,
				payload,
				options,
				// send the target BrowserWindow id for callback and error handling
				target: target.webContents.id
			});
		} else if (Process.is('renderer')) {
			if (typeof target !== 'string') {
				console.error('[IpcFlux] mutation not passed as parameter');
				return;
			}

			// send a call to the main process to dispatch the action
			ipcRenderer.send(channels.call, {
				...arg,
				mutation: target,
				payload: mutation,
				options: payload,
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

	registerMutation(mutation, handler) {
		const instance = this;

		const entry = Array.isArray(instance._mutations[mutation]) ? instance._mutations[mutation] : instance._mutations[mutation] = [];
		entry.push((payload) => {
			handler.call(instance, instance.state, payload);
		});
	}

	registerGetter(getter, raw) {
		const instance = this;

		if (this._getters[getter]) {
			console.log('[IpcFlux] duplicate getter key');
			return;
		}

		this._getters[getter] = () => {
			return raw(instance.state, instance.getters);
		};
	}

	_withCommit(fn) {
		const committing = this._committing;
		this._committing = true;
		fn();
		this._committing = committing;
	}
}

export default IpcFlux;