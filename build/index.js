'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; //     _                  _____
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
	handshake: {
		default: 'IpcFlux-Handshake',
		callback: 'IpcFlux-Handshake-Callback',
		success: 'IpcFlux-Handshake-Success'
	}
};

// remove all active IpcFlux listeners for the current process
var rmListeners = function rmListeners() {
	var emitter = Process.is('main') ? _electron.ipcMain : _electron.ipcRenderer;

	Object.values(channels).forEach(function (channel) {
		(typeof channel === 'undefined' ? 'undefined' : _typeof(channel)) === 'object' ? Object.values(channel).forEach(function (subchannel) {
			emitter.removeAllListeners(subchannel);
		}) : emitter.removeAllListeners(channel);
	});
};

var IpcFlux = function () {
	function IpcFlux() {
		var _this = this;

		var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

		_classCallCheck(this, IpcFlux);

		if (Process.env.type() !== 'production') {
			// check if Promises can be used
			assert(typeof Promise !== 'undefined', '[IpcFlux] requires Promises to function.');
			assert(this instanceof IpcFlux, '[IpcFlux] must be called with the new operator.');
		}

		// remove IpcFlux listeners
		rmListeners();

		var _options$actions = options.actions,
		    actions = _options$actions === undefined ? {} : _options$actions,
		    _options$config = options.config,
		    config = _options$config === undefined ? {} : _options$config;

		// defined due to `this` being reassigned in arrow functions

		var instance = this;

		this._actions = Object.create(null);
		this._config = Object.create(null);

		this._config = _extends({
			handshake: {
				timeout: 10000
			}
		}, config);

		// the listener to be called for actions
		var actionEmitHandler = function actionEmitHandler(event, arg) {
			if (instance.actionExists(arg.action)) {
				var target = Process.is('renderer') ? _electron.remote.getCurrentWindow().id : arg.target;

				var act = instance.dispatchAction(_extends({}, arg, { target: target }), arg.action, arg.payload);

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
			}
		};

		// define the process emitter, minimizes code duplication
		var emitter = Process.is('main') ? _electron.ipcMain : _electron.ipcRenderer;

		// the emitter event handlers for calls and errors
		emitter.on(channels.call, emitterCallListener);
		emitter.on(channels.error, function (event, err) {
			if ((typeof err === 'undefined' ? 'undefined' : _typeof(err)) === 'object') {
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

		var dispatchAction = this.dispatchAction,
		    dispatchExternalAction = this.dispatchExternalAction;


		this.dispatch = function (type, payload) {
			return dispatchAction.call(instance, {
				process: Process.type(),
				target: Process.is('renderer') ? _electron.remote.getCurrentWindow().id : null
			}, type, payload);
		};

		this.dispatchExternal = function (target, action, payload) {
			// return a promise of the dispatch, resolving on callback
			return new Promise(function (resolve) {
				dispatchExternalAction.call(instance, target, action, payload);

				// only resolve if the action callback is the same as that called, then remove the callback handler
				var listener = function listener(event, arg) {
					if (Process.is('renderer') ? arg.action === target : arg.action === action) {
						emitter.removeListener(channels.callback, listener);
						resolve(arg.data);
					}
				};

				// setup a callback listener
				emitter.on(channels.callback, listener);
			});
		};

		// register all actions defined in the class constructor options
		Object.keys(actions).forEach(function (action) {
			_this.registerAction(action, actions[action]);
		});

		this.debug = {
			process: Process.type(),
			channels: channels

			// define the handshake config, specific to the process type
		};this.handshake = Process.is('main') ? {
			done: 0,
			total: 0,
			completed: false,
			callbacks_sent: 0,
			targets: [],
			timeout: this._config.handshake.timeout
		} : {
			completed: false,
			timeout: this._config.handshake.timeout,
			initiated: false,
			callback_received: false

			// start the handshaking process
		};this.beginHandshake();
	}

	_createClass(IpcFlux, [{
		key: 'beginHandshake',
		value: function beginHandshake() {
			var handshake = this.handshake;


			if (Process.is('main')) {
				var handshakeListener = function handshakeListener(event, arg) {
					handshake.total += 1;
					// add target to targets, used to determine which handshakes pass/fail
					handshake.targets.push(arg.target);

					// return handshake with target
					event.sender.send(channels.handshake.callback, {
						target: arg.target
					});
				};

				// create a listener, each handshake is initiated from the renderer
				_electron.ipcMain.on(channels.handshake.default, handshakeListener);

				var mainHandshakeListener = function mainHandshakeListener(event, arg) {
					// if the target has already been added (initial handshake successful)
					if (handshake.targets.indexOf(arg.target) >= 0) {
						handshake.done += 1;
						handshake.completed = handshake.done === handshake.total;
					} else {
						console.error('[IpcFlux] handshake return from unknown BrowserWindow id');
					}

					if (handshake.completed) {
						// remove this handshake listener
						_electron.ipcMain.removeListener(channels.handshake.success, mainHandshakeListener);
						_electron.ipcMain.removeListener(channels.handshake.default, handshakeListener);
					}
				};

				_electron.ipcMain.on(channels.handshake.success, mainHandshakeListener);

				// called to check if handshakes have been completed
				setTimeout(function () {
					handshake.completed = handshake.done === handshake.total;

					if (!handshake.completed) {
						var cause = void 0;
						if (handshake.callbacks_sent < handshake.total || handshake.callbacks_sent < handshake.targets.length) {
							cause = 'not all callbacks were returned';
						} else if (handshake.done < handshake.total) {
							cause = 'not all initiated handshakes completed';
						} else {
							cause = 'unknown error';
						}

						// send error to all windows
						_electron.webContents.getAllWebContents().forEach(function (win) {
							win.send(channels.error, {
								type: 'throw',
								message: '[IpcFlux] handshake failed (timeout): ' + cause
							});
						});
						throw new Error('[IpcFlux] handshake failed (timeout): ' + cause);
					}

					// remove all main handshake listeners
					_electron.ipcMain.removeAllListeners(channels.handshake.default);
					_electron.ipcMain.removeAllListeners(channels.handshake.success);
				}, handshake.timeout);
			} else if (Process.is('renderer')) {
				// initiate the handshake
				_electron.ipcRenderer.send(channels.handshake.default, {
					target: _electron.remote.getCurrentWindow().id
				});
				handshake.initiated = true;

				var rendererHandshakeListener = function rendererHandshakeListener(event, arg) {
					handshake.callback_received = true;
					if (arg.target === _electron.remote.getCurrentWindow().id) {
						// return the handshake, verifies in main process handshake is complete
						event.sender.send(channels.handshake.success, {
							target: arg.target
						});
						handshake.completed = true;
						// remove this listener
						_electron.ipcRenderer.removeListener(channels.handshake.callback, rendererHandshakeListener);

						// remove all renderer handshake listeners
						_electron.ipcRenderer.removeAllListeners(channels.handshake.default);
						_electron.ipcRenderer.removeAllListeners(channels.handshake.callback);
					}
				};

				_electron.ipcRenderer.on(channels.handshake.callback, rendererHandshakeListener);

				// called to check if this handshake has been completed
				setTimeout(function () {
					if (!handshake.done) {
						var cause = void 0;
						if (handshake.initiated === false) {
							cause = 'handshake not initiated';
						} else if (handshake.callback_received === false) {
							cause = 'handshake callback not received';
						} else if (handshake.completed === false) {
							cause = 'handshake was not completed';
						} else {
							cause = 'unknown error';
						}
						throw new Error('[IpcFlux] handshake failed (timeout): ' + cause);
					}

					// remove all renderer handshake listeners
					_electron.ipcRenderer.removeAllListeners(channels.handshake);
					_electron.ipcRenderer.removeAllListeners(channels.handshake.callback);
				}, handshake.timeout);
			}
		}
	}, {
		key: 'actionExists',
		value: function actionExists(action) {
			return !!this._actions[action];
		}
	}, {
		key: 'dispatchAction',
		value: function dispatchAction(_caller, _action, _payload) {
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

			// return a promise of the action function, async
			return entry.length > 1 ? Promise.all(entry.map(function (handler) {
				return handler(payload);
			})) : entry[0](payload);
		}
	}, {
		key: 'dispatchExternalAction',
		value: function dispatchExternalAction(_target, _action, _payload) {
			// same for both process types
			var arg = {
				process: Process.type(),
				callType: 'action'
			};

			if (Process.is('main')) {
				// checks target is an instance of BrowserWindow, or if is a BrowserWindow id
				if ((typeof _target === 'undefined' ? 'undefined' : _typeof(_target)) === 'object' || typeof _target === 'number') {} else {
					console.error('[IpcFlux] target passed is not instanceof BrowserWindow or an active BrowserWindow\'s id');
					return;
				}

				// converts BrowserWindow or BrowserWindow id to webContents for instance checking
				_target = typeof _target === 'number' ? _electron.webContents.fromId(_target) : _electron.webContents in _target ? _target.webContents : {};

				if (!(_target instanceof _electron.webContents)) {
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
				_electron.webContents.fromId(_target.webContents.id).send(channels.call, _extends({}, arg, {
					action: _action,
					// send the target BrowserWindow id for callback and error handling
					target: _target.webContents.id
				}));
			} else if (Process.is('renderer')) {
				// _target param is action, and _action param is payload because renderer process does not require target BrowserWindow to be passed
				var _action$_payload = {
					_action: _target,
					_payload: _action2
				},
				    _action2 = _action$_payload._action,
				    _payload2 = _action$_payload._payload;


				if (typeof _action2 !== 'string') {
					console.error('[IpcFlux] action not passed as parameter');
					return;
				}

				// add the payload to `arg` if not undefined
				if (typeof _payload2 !== 'undefined') {
					arg.payload = _payload2;
				}

				// send a call to the main process to dispatch the action
				_electron.ipcRenderer.send(channels.call, _extends({}, arg, {
					action: _action2,
					// send the current BrowserWindow id for callback and error handling
					target: _electron.remote.getCurrentWindow().id
				}));
			}
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
	}]);

	return IpcFlux;
}();

exports.default = IpcFlux;
//# sourceMappingURL=index.js.map