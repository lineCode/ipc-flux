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

import { ipcMain, ipcRenderer, webContents, remote } from 'electron';

import utils from './utils';

const { Process, assert, isPromise } = utils;

// predefined channels
const channels = {
	call: 'IpcFlux-Call',
	callback: 'IpcFlux-Callback',
	error: 'IpcFlux-Error',
	state: 'IpcFlux-State',
	processes: 'IpcFlux-Processes'
};

// remove all existing IpcFlux listeners
const removeExistingListeners = () => {
	Object.values(channels).forEach(channel => {
		Process.emitter().removeAllListeners(channel);
	});
};

const checkActiveInstance = (check) => {
	return webContents.getAllWebContents().map(contents => contents.id).indexOf(check) >= 0;
};

const genCallbackId = () => {
	return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

class IpcFlux {
	constructor(options = {}) {
		if (Process.env.type() !== 'production') {
			// check if Promises can be used
			assert(typeof Promise === 'undefined', 'Promises are required');
		}

		removeExistingListeners();

		const { id, actions = {}, mutations = {}, getters = {}, config = {}, state } = options;

		// check if state is defined or is an object with something in it
		assert((state !== undefined || (typeof state === 'object' && Object.keys(state).length > 0)) && Process.is('renderer'), 'initial state must be declared in main process');

		// defined due to `this` being reassigned in arrow functions
		const flux = this;

		// window reference id, if no custom id is specified, use the browserWindow id or 'main'
		this._id = Process.is('renderer') ? id || remote.getCurrentWindow().id : 'main';

		// define globs used throughout
		this._committing = false;
		this._actions = Object.create(null);
		this._mutations = Object.create(null);
		this._getters = Object.create(null);
		this._subscribers = [];

		this._instances = {};

		// state still needs to be defined within renderer instances, just not from initial config, hence the assert above
		this.state = Process.is('main') ? state || {} : {};

		this._config = {
			maxListeners: 50,
			debug: false,
			...config
		};

		const eventHandlers = {
			action: (event, arg) => {
				if (arg.target === 'main' || Process.is('renderer')) {
					if (flux.actionExists(arg.action)) {
						const act = Process.is('renderer') ? flux.dispatch('local', arg.action, arg.payload) : dispatch.call(flux, arg.target, arg.action, arg.payload);

						if (isPromise(act)) {
							act.then(data => {
								event.sender.send(channels.callback, {
									...arg,
									data
								});
							});
						} else {
							event.sender.send(channels.error, `[IpcFlux] '${arg.action}' action called from ${arg.process} process, in ${Process.type()} process, did not return a Promise`);
							event.sender.send(channels.callback, {
								...arg,
								target
							});
						}
					}
				} else {
					const target = typeof arg.target === 'string' ? flux._instances[arg.target] : arg.target;
					const cbid = arg.callback;

					if (!checkActiveInstance(target)) {
						return;
					}

					webContents.fromId(target).send(channels.call, {...arg});

					const act = new Promise(resolve => {
						const listener = (event, arg) => {
							if (arg.target === target && arg.callback === cbid) {
								ipcMain.removeListener(channels.callback, listener);
								resolve(arg.data);
							}
						};

						ipcMain.on(channels.callback, listener);
					});

					act.then(data => {
						event.sender.send(channels.callback, {
							...arg,
							data
						});
					});
				}
			},
			mutation: (event, arg) => {
				if (flux.mutationExists(arg.mutation)) {
					commit.call(flux, arg.mutation, arg.payload);
				}
			}
		};

		// because a single channel (`channel.call`) is used for all callers, route different calls to their required handler
		const callHandler = (event, arg) => {
			if (typeof arg !== 'object') {
				return;
			}

			switch (arg.callType) {
				case 'action':
					eventHandlers.action(event, arg);
					break;
				case 'mutation':
					eventHandlers.mutation(event, arg);
					break;
				default:
					break;
			}
		};

		// define the process emitter, minimizes code duplication
		const emitter = Process.is('main') ? ipcMain : ipcRenderer;
		emitter.setMaxListeners(this._config.maxListeners);

		const defineInstances = () => {
			if (Process.is('main')) {
				ipcMain.on(channels.processes, (event, arg) => {
					if (arg.uid === 'main' || arg.uid === 'local') {
						event.sender.send(channels.error, `[IpcFlux] instance id cannot be 'main' or 'local' (BrowserWindow: ${arg.id})`);
					} else if (flux._instances[arg.uid]) {
						event.sender.send(channels.error, `[IpcFlux] instance id '${arg.uid}' already defined (BrowserWindow: ${arg.id})`);
					} else {
						flux._instances[arg.uid] = arg.id;
					}
				});
			} else {
				ipcRenderer.send(channels.processes, {
					uid: flux._id,
					id: remote.getCurrentWindow().id || null
				});
			}
		};

		defineInstances();

		// the emitter event handlers for calls and errors
		emitter.on(channels.call, callHandler);

		const errorCallHandler = (event, err) => {
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
		};

		emitter.on(channels.error, errorCallHandler);

		const { dispatch, commit, commitExternal } = this;

		this.dispatch = (target, type, payload) => {
			if (target === 'local' || (!Process.is('main') && target === remote.getCurrentWindow().id)) {
				return dispatch.call(flux, target, type, payload);
			} else {
				const cbid = genCallbackId();

				dispatch.call(flux, target, type, payload, cbid);

				return new Promise((resolve) => {
					// only resolve if the action callback is the same as that called, then remove the callback handler
					const listener = (event, arg) => {
						if (arg.target === target && arg.callback == cbid) {
							emitter.removeListener(channels.callback, listener);
							resolve(arg.data);
						}
					};

					// setup a callback listener
					emitter.on(channels.callback, listener);
				});
			}
		};

		this.commit = (mutation, payload, options) => {
			commit.call(flux, mutation, payload, options);
		};

		this.commitExternal = (target, mutation, payload, options) => {
			// return a promise of the dispatch, resolving on callback
			commitExternal.call(flux, target, mutation, payload, options);
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

	dispatch(_target, _action, _payload, _cbid) {
		const flux = this;

		const { target, action, payload, cbid } = {
			target: _target,
			action: _action,
			payload: _payload,
			cbid: _cbid
		};

		if (target === 'local' || (Process.is('main') && target === 'main') || (!Process.is('main') && target === remote.getCurrentWindow().id)) {
			const entry = this._actions[action];

			if (!entry) {
				console.error(`[IpcFlux] unknown action: ${action}`);
				return;
			}

			return entry.length > 1 ? Promise.all(entry.map(handler => handler(payload))) : entry[0](payload);
		} else {
			const arg = {
				process: Process.type(),
				caller: Process.is('renderer') ? remote.getCurrentWindow().id : 'main',
				callType: 'action'
			};

			let _id = (typeof target === 'number' ? target : typeof target === 'string' ? target : null) || null;

			if (_id === null) {
				console.error('[IpcFlux] target passed as parameter was not BrowserWindow id or a valid ipc-flux reference id');
				return;
			}

			if (!Process.is('renderer') && !checkActiveInstance(_id)) {
				return;
			}

			const emitter = Process.is('main') ? webContents.fromId(_id).webContents : ipcRenderer;

			emitter.send(channels.call, {
				...arg,
				action,
				payload,
				target: _id,
				callback: cbid
			});
		}
	}

	commit(_type, _payload, _options) {
		const flux = this;

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

		flux._withCommit(() => {
			entry.forEach(handler => {
				handler(payload);
			});
		});

		this._subscribers.forEach(sub => sub(mutation, this.state));
	}

	commitExternal(_target, _mutation, _payload, _options) {
		const flux = this;

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
				console.error('[IpcFlux] target passed is not instance of BrowserWindow or active BrowserWindow id');
				return;
			}

			target = typeof target === 'number' ? webContents.fromId(target) : target.webContents;

			if (!target.webContents) {
				console.error('[IpcFlux] target passed is not instance of BrowserWindow or active BrowserWindow id');
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
				target: remote.getCurrentWindow().id
			});
		}
	}

	registerAction(action, handler) {
		const flux = this;

		// checks if action is in `_actions` array, if not, create an array at the required key
		const entry = Array.isArray(flux._actions[action]) ? flux._actions[action] : flux._actions[action] = [];

		// add the action to the array
		// note that this allows actions to be created using the same action_name, but with different handlers without being overwritten
		entry.push((payload, cb) => {
			// add the handler to `_actions`, passing in { dispatch, dispatchExternal } for use within the action, as well as the payload and callback
			let res = handler({
				dispatch: flux.dispatch,
				commit: flux.commit,
				commitExternal: flux.commitExternal,
				state: flux.state
			}, payload, cb);

			// if not already a Promise, make it one
			if (!isPromise(res)) {
				res = Promise.resolve(res);
			}

			return res;
		});
	}

	registerMutation(mutation, handler) {
		const flux = this;

		const entry = Array.isArray(flux._mutations[mutation]) ? flux._mutations[mutation] : flux._mutations[mutation] = [];

		entry.push((payload) => {
			handler.call(flux, flux.state, payload);
		});
	}

	registerGetter(getter, raw) {
		const flux = this;

		if (this._getters[getter]) {
			console.log('[IpcFlux] duplicate getter key');
			return;
		}

		this._getters[getter] = () => {
			return raw(flux.state, flux.getters);
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