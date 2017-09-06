'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); //
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

var _electron = require('electron');

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Process = _utils2.default.Process,
    assert = _utils2.default.assert,
    isPromise = _utils2.default.isPromise;

// predefined channels

var channels = {
	call: 'IpcFlux-Call',
	callback: 'IpcFlux-Callback',
	error: 'IpcFlux-Error',
	state: 'IpcFlux-State'
};

// remove all existing IpcFlux listeners
var removeExistingListeners = function removeExistingListeners() {
	Object.values(channels).forEach(function (channel) {
		Process.emitter().removeAllListeners(channel);
	});
};

var IpcFlux = function () {
	function IpcFlux() {
		var _this = this;

		var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

		_classCallCheck(this, IpcFlux);

		if (Process.env.type() !== 'production') {
			// check if Promises can be used
			assert(typeof Promise === 'undefined', 'Promises are required');
		}

		removeExistingListeners();

		var id = options.id,
		    _options$actions = options.actions,
		    actions = _options$actions === undefined ? {} : _options$actions,
		    _options$mutations = options.mutations,
		    mutations = _options$mutations === undefined ? {} : _options$mutations,
		    _options$getters = options.getters,
		    getters = _options$getters === undefined ? {} : _options$getters,
		    _options$config = options.config,
		    config = _options$config === undefined ? {} : _options$config,
		    state = options.state;

		// check if state is defined or is an object with something in it

		assert((state !== undefined || (typeof state === 'undefined' ? 'undefined' : _typeof(state)) === 'object' && Object.keys(state).length > 0) && Process.is('renderer'), 'initial state must be declared in main process');

		// defined due to `this` being reassigned in arrow functions
		var flux = this;

		// window reference id, if no custom id is specified, use the browserWindow id or 'main'
		this._id = id || (Process.is('renderer') ? _electron.remote.getCurrentWindow().id : 'main');

		// define globs used throughout
		this._committing = false;
		this._actions = Object.create(null);
		this._mutations = Object.create(null);
		this._getters = Object.create(null);
		this._subscribers = [];

		// state still needs to be defined within renderer instances, just not from initial config, hence the assert above
		this.state = Process.is('main') ? state || {} : {};

		this._config = _extends({
			maxListeners: 50,
			debug: false
		}, config);

		// the listener to be called for actions
		var actionRouteHandler = function actionRouteHandler(event, arg) {
			if (flux.actionExists(arg.action)) {
				var target = Process.is('renderer') ? _electron.remote.getCurrentWindow().id : arg.target;

				var act = dispatch.call(flux, _extends({}, arg, { target: target }), arg.action, arg.payload);

				if (isPromise(act)) {
					// on Promise complete, send a callback to the dispatcher
					act.then(function (data) {
						event.sender.send(channels.callback, _extends({}, arg, {
							target: target,
							data: data
						}));
					});
				} else {
					// send a callback to the dispatcher
					event.sender.send(channels.error, '[IpcFlux] \'' + arg.action + '\' action called from ' + arg.process + ' process, in ' + Process.type() + ' process, did not return a Promise');
					event.sender.send(channels.callback, _extends({}, arg, {
						target: target
					}));
				}
			} else {
				// if the action doesn't exist, send an error message back to the caller
				event.sender.send(channels.error, '[IpcFlux] unknown action called from ' + arg.process + ' process, in ' + Process.type() + ' process: ' + arg.action);
			}
		};

		// the listener to be called for mutations
		var mutationRouteHandler = function mutationRouteHandler(event, arg) {
			if (flux.mutationExists(arg.mutation)) {
				commit.call(flux, arg.mutation, arg.payload);
			}
		};

		// because a single channel (`channel.call`) is used for all callers, route different calls to their required handler
		var routeCall = function routeCall(event, arg) {
			if ((typeof arg === 'undefined' ? 'undefined' : _typeof(arg)) !== 'object') {
				return;
			}

			switch (arg.callType) {
				// if the call type is an action, let `actionEmitHandler` handle it
				case 'action':
					actionRouteHandler(event, arg);
					break;
				case 'mutation':
					mutationRouteHandler(event, arg);
					break;
				default:
					break;
			}
		};

		// define the process emitter, minimizes code duplication
		var emitter = Process.is('main') ? _electron.ipcMain : _electron.ipcRenderer;

		emitter.setMaxListeners(this._config.maxListeners);

		// the emitter event handlers for calls and errors
		emitter.on(channels.call, routeCall);

		var errorCallHandler = function errorCallHandler(event, err) {
			if ((typeof err === 'undefined' ? 'undefined' : _typeof(err)) === 'object') {
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

		var dispatch = this.dispatch,
		    dispatchExternal = this.dispatchExternal,
		    commit = this.commit,
		    commitExternal = this.commitExternal;


		this.dispatch = function (type, payload) {
			return dispatch.call(flux, {
				process: Process.type(),
				target: Process.is('renderer') ? _electron.remote.getCurrentWindow().id : 0
			}, type, payload);
		};

		this.dispatchExternal = function (target, action, payload) {
			// return a promise of the dispatch, resolving on callback
			dispatchExternal.call(flux, target, action, payload);

			return new Promise(function (resolve, reject) {
				// only resolve if the action callback is the same as that called, then remove the callback handler
				var listener = function listener(event, arg) {
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

		this.commit = function (mutation, payload, options) {
			commit.call(flux, mutation, payload, options);
		};

		this.commitExternal = function (target, mutation, payload, options) {
			// return a promise of the dispatch, resolving on callback
			commitExternal.call(flux, target, mutation, payload, options);
		};

		// register all actions defined in the class constructor options
		Object.keys(actions).forEach(function (action) {
			_this.registerAction(action, actions[action]);
		});

		// register all mutations defined in the class constructor options
		Object.keys(mutations).forEach(function (mutation) {
			_this.registerMutation(mutation, mutations[mutation]);
		});

		// register all getters defined in the class constructor options
		Object.keys(getters).forEach(function (getter) {
			_this.registerGetter(getter, getters[getter]);
		});

		this.debug = {
			process: Process.type(),
			channels: channels
		};
	}

	_createClass(IpcFlux, [{
		key: 'actionExists',
		value: function actionExists(action) {
			return Boolean(this._actions[action]);
		}
	}, {
		key: 'mutationExists',
		value: function mutationExists(mutation) {
			return Boolean(this._mutations[mutation]);
		}
	}, {
		key: 'dispatch',
		value: function dispatch(_caller, _action, _payload) {
			var _action$payload = {
				action: _action,
				payload: _payload
			},
			    action = _action$payload.action,
			    payload = _action$payload.payload;


			var entry = this._actions[action];

			// if no action was found
			if (!entry) {
				// action was dispatched from this process, show the error in this process
				if (_caller.process === Process.type()) {
					console.error('[IpcFlux] unknown action: ' + action);
				}
				// action existence is checked in `actionListener` above, as we don't know the actions defined in the other process
				return;
			}

			// return a promise of the action function
			return entry.length > 1 ? Promise.all(entry.map(function (handler) {
				return handler(payload);
			})) : entry[0](payload);
		}
	}, {
		key: 'dispatchExternal',
		value: function dispatchExternal(_target, _action, _payload) {
			// same for both process types
			var arg = {
				process: Process.type(),
				callType: 'action'
			};

			var _target$action$payloa = {
				target: _target,
				action: _action,
				payload: _payload
			},
			    target = _target$action$payloa.target,
			    action = _target$action$payloa.action,
			    payload = _target$action$payloa.payload;


			if (Process.is('main')) {
				// checks target is an instance of BrowserWindow, or if is a BrowserWindow id
				if ((typeof target === 'undefined' ? 'undefined' : _typeof(target)) !== 'object' && typeof target !== 'number') {
					console.error('[IpcFlux] target passed is not instance of BrowserWindow or active BrowserWindow id');
					return;
				}

				// converts BrowserWindow or BrowserWindow id to webContents for flux checking
				target = typeof target === 'number' ? _electron.webContents.fromId(target) : target.webContents;

				if (!target.webContents) {
					console.error('[IpcFlux] target passed is not an instance of BrowserWindow or active BrowserWindow id');
					return;
				}

				if (typeof action !== 'string') {
					console.error('[IpcFlux] action not passed as parameter');
					return;
				}

				_electron.webContents.fromId(target.webContents.id).send(channels.call, _extends({}, arg, {
					action: action,
					payload: payload,
					// send the target BrowserWindow id for callback and error handling
					target: target.webContents.id
				}));
			} else if (Process.is('renderer')) {
				if (typeof target !== 'string') {
					console.error('[IpcFlux] action not passed as parameter');
					return;
				}

				// send a call to the main process to dispatch the action
				_electron.ipcRenderer.send(channels.call, _extends({}, arg, {
					action: target,
					payload: action,
					// send the current BrowserWindow id for callback and error handling
					target: _electron.remote.getCurrentWindow().id
				}));
			}
		}
	}, {
		key: 'commit',
		value: function commit(_type, _payload, _options) {
			var _this2 = this;

			var flux = this;

			var _type$payload$options = {
				type: _type,
				payload: _payload,
				options: _options
			},
			    type = _type$payload$options.type,
			    payload = _type$payload$options.payload,
			    options = _type$payload$options.options;


			var mutation = { type: type, payload: payload };
			var entry = this._mutations[type];

			if (!entry) {
				console.error('[IpcFlux] unknown mutation type: ' + type);
				return;
			}

			flux._withCommit(function () {
				entry.forEach(function (handler) {
					handler(payload);
				});
			});

			this._subscribers.forEach(function (sub) {
				return sub(mutation, _this2.state);
			});
		}
	}, {
		key: 'commitExternal',
		value: function commitExternal(_target, _mutation, _payload, _options) {
			var flux = this;

			var arg = {
				process: Process.type(),
				callType: 'mutation'
			};

			var _target$mutation$payl = {
				target: _target,
				mutation: _mutation,
				payload: _payload,
				options: _options
			},
			    target = _target$mutation$payl.target,
			    mutation = _target$mutation$payl.mutation,
			    payload = _target$mutation$payl.payload,
			    options = _target$mutation$payl.options;


			if (Process.is('main')) {
				if ((typeof target === 'undefined' ? 'undefined' : _typeof(target)) !== 'object' && typeof target !== 'number') {
					console.error('[IpcFlux] target passed is not instance of BrowserWindow or active BrowserWindow id');
					return;
				}

				target = typeof target === 'number' ? _electron.webContents.fromId(target) : target.webContents;

				if (!target.webContents) {
					console.error('[IpcFlux] target passed is not instance of BrowserWindow or active BrowserWindow id');
					return;
				}

				if (typeof mutation !== 'string') {
					console.error('[IpcFlux] mutation not passed as parameter');
					return;
				}

				_electron.webContents.fromId(target.webContents.id).send(channels.call, _extends({}, arg, {
					mutation: mutation,
					payload: payload,
					options: options,
					// send the target BrowserWindow id for callback and error handling
					target: target.webContents.id
				}));
			} else if (Process.is('renderer')) {
				if (typeof target !== 'string') {
					console.error('[IpcFlux] mutation not passed as parameter');
					return;
				}

				// send a call to the main process to dispatch the action
				_electron.ipcRenderer.send(channels.call, _extends({}, arg, {
					mutation: target,
					payload: mutation,
					options: payload,
					// send the current BrowserWindow id for callback and error handling
					target: _electron.remote.getCurrentWindow().id
				}));
			}
		}
	}, {
		key: 'registerAction',
		value: function registerAction(action, handler) {
			var flux = this;

			// checks if action is in `_actions` array, if not, create an array at the required key
			var entry = Array.isArray(flux._actions[action]) ? flux._actions[action] : flux._actions[action] = [];

			// add the action to the array
			// note that this allows actions to be created using the same action_name, but with different handlers without being overwritten
			entry.push(function (payload, cb) {
				// add the handler to `_actions`, passing in { dispatch, dispatchExternal } for use within the action, as well as the payload and callback
				var res = handler({
					dispatch: flux.dispatch,
					dispatchExternal: flux.dispatchExternal,
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
	}, {
		key: 'registerMutation',
		value: function registerMutation(mutation, handler) {
			var flux = this;

			var entry = Array.isArray(flux._mutations[mutation]) ? flux._mutations[mutation] : flux._mutations[mutation] = [];
			entry.push(function (payload) {
				handler.call(flux, flux.state, payload);
			});
		}
	}, {
		key: 'registerGetter',
		value: function registerGetter(getter, raw) {
			var flux = this;

			if (this._getters[getter]) {
				console.log('[IpcFlux] duplicate getter key');
				return;
			}

			this._getters[getter] = function () {
				return raw(flux.state, flux.getters);
			};
		}
	}, {
		key: '_withCommit',
		value: function _withCommit(fn) {
			var committing = this._committing;
			this._committing = true;
			fn();
			this._committing = committing;
		}
	}]);

	return IpcFlux;
}();

exports.default = IpcFlux;
//# sourceMappingURL=index.js.map