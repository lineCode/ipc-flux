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
var rmListeners = function rmListeners() {
	var emitter = Process.is('main') ? _electron.ipcMain : _electron.ipcRenderer;

	Object.values(channels).forEach(function (channel) {
		emitter.removeAllListeners(channel);
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

		// remove IpcFlux listeners
		rmListeners();

		var _options$actions = options.actions,
		    actions = _options$actions === undefined ? {} : _options$actions,
		    _options$mutations = options.mutations,
		    mutations = _options$mutations === undefined ? {} : _options$mutations,
		    _options$config = options.config,
		    config = _options$config === undefined ? {} : _options$config;
		var state = options.state;


		assert((state !== undefined || (typeof state === 'undefined' ? 'undefined' : _typeof(state)) === 'object' && Object.keys(state).length > 0) && Process.is('renderer'), 'initial state must be declared in main process');

		if (Process.is('main')) {
			state = state || {};
		}

		// defined due to `this` being reassigned in arrow functions (grr)
		var instance = this;

		this._committing = false;
		this._actions = Object.create(null);
		this._mutations = Object.create(null);
		this._getters = Object.create(null);
		this._subscribers = [];

		this._config = Object.create(null);

		this._config = _extends({
			maxListeners: 50,
			debug: false
		}, config);

		// the listener to be called for actions
		var actionEmitHandler = function actionEmitHandler(event, arg) {
			if (instance.actionExists(arg.action)) {
				var target = Process.is('renderer') ? _electron.remote.getCurrentWindow().id : arg.target;

				var act = dispatch.call(instance, _extends({}, arg, { target: target }), arg.action, arg.payload);

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

		// run on `channel.call`
		var emitterCallListener = function emitterCallListener(event, arg) {
			if ((typeof arg === 'undefined' ? 'undefined' : _typeof(arg)) !== 'object') {
				return;
			}

			switch (arg.callType) {
				// if the call type is an action, let `actionEmitHandler` handle it
				case 'action':
					actionEmitHandler(event, arg);
					break;
				default:
					break;
			}
		};

		// define the process emitter, minimizes code duplication
		var emitter = Process.is('main') ? _electron.ipcMain : _electron.ipcRenderer;

		emitter.setMaxListeners(this._config.maxListeners);

		// the emitter event handlers for calls and errors
		emitter.on(channels.call, emitterCallListener);

		emitter.on(channels.error, function (event, err) {
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
		});

		var dispatch = this.dispatch,
		    dispatchExternal = this.dispatchExternal,
		    commit = this.commit;


		this.dispatch = function (type, payload) {
			return dispatch.call(instance, {
				process: Process.type(),
				target: Process.is('renderer') ? _electron.remote.getCurrentWindow().id : 0
			}, type, payload);
		};

		this.dispatchExternal = function (target, action, payload) {
			// return a promise of the dispatch, resolving on callback
			dispatchExternal.call(instance, target, action, payload);

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

		this.commit = function (type, payload, options) {
			return commit.call(instance, type, payload, options);
		};

		// register all actions defined in the class constructor options
		Object.keys(actions).forEach(function (action) {
			_this.registerAction(action, actions[action]);
		});

		// register all mutations defined in the class constructor options
		Object.keys(mutations).forEach(function (mutation) {
			_this.registerMutation(mutation, mutations[mutation]);
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
					console.error('[IpcFlux] target passed is not instanceof BrowserWindow or an active BrowserWindow\'s id');
					return;
				}

				// converts BrowserWindow or BrowserWindow id to webContents for instance checking
				target = typeof target === 'number' ? _electron.webContents.fromId(target) : target.webContents;

				if (!target.webContents) {
					console.error('[IpcFlux] target passed is not an instanceof BrowserWindow or an active BrowserWindow\'s id');
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

			var instance = this;

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

			instance._withCommit(function () {
				entry.forEach(function (handler) {
					handler(payload);
				});
			});

			this._subscribers.forEach(function (sub) {
				return sub(mutation, _this2.state);
			});
		}
	}, {
		key: 'registerAction',
		value: function registerAction(action, handler) {
			var instance = this;

			// checks if action is in `_actions` array, if not, create an array at the required key
			var entry = Array.isArray(instance._actions[action]) ? instance._actions[action] : instance._actions[action] = [];

			// add the action to the array
			// note that this allows actions to be created using the same action_name, but with different handlers without being overwritten
			entry.push(function (payload, cb) {
				// add the handler to `_actions`, passing in { dispatch, dispatchExternal } for use within the action, as well as the payload and callback
				var res = handler({
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
	}, {
		key: 'registerMutation',
		value: function registerMutation(mutation, handler) {
			var instance = this;

			var entry = instance._mutations[mutation] || (instance._mutations[mutation] = []);
			entry.push(function (payload) {
				handler.call(instance, instance.state, payload);
			});
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