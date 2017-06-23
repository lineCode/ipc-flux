'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _electron = require('electron');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var channels = {
	call: 'ProcessComms-Call',
	callback: 'ProcessComms-Callback',
	error: 'ProcessComms-Error'
};

var assert = function assert(condition, msg) {
	if (!condition) {
		throw new Error('[ProcessComms] ' + msg);
	}
};

// determines process originating from
var Process = {
	// return the type of process as a string
	type: function type() {
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
	is: function is(type) {
		if (typeof type === 'string') {
			return type === Process.type();
		} else {
			throw new TypeError('type of `type` was not string');
		}
	}
};

var isPromise = function isPromise(val) {
	return val && typeof val.then === 'function';
};

var ProcessComms = function () {
	function ProcessComms() {
		var _this = this;

		var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

		_classCallCheck(this, ProcessComms);

		if (process.env.NODE_ENV !== 'production') {
			assert(typeof Promise !== 'undefined', 'ProcessComms requires Promises to function.');
			assert(this instanceof ProcessComms, 'ProcessComms must be called with the new operator.');
		}

		var _options$actions = options.actions,
		    actions = _options$actions === undefined ? {} : _options$actions;


		var instance = this;

		this._actions = Object.create(null);

		Object.keys(actions).forEach(function (action) {
			_this.registerAction(action, actions[action]);
		});

		// setup ipc action listeners
		if (Process.is('main')) {
			// main ipc listener
			_electron.ipcMain.on(channels.call, function (event, arg) {
				if (instance.actionExists(arg.action)) {
					var act = instance.dispatchAction({ process: arg.process, target: arg.target }, arg.action, arg.payload);

					if (isPromise(act)) {
						act.then(function (data) {
							event.sender.send(channels.callback, _extends({}, arg, {
								data: data
							}));
						});
					} else {
						console.log('[ProcessComms] Promise was not returned');
						event.sender.send(channels.callback, _extends({}, arg));
					}
				} else {
					event.sender.send(channels.error, '[ProcessComms] unknown action in main process: ' + arg.action);
				}
			});

			// main error ipc listener
			_electron.ipcMain.on(channels.error, function (event, err) {
				console.error(err);
			});
		} else if (Process.is('renderer')) {
			// renderer ipc listener
			_electron.ipcRenderer.on(channels.call, function (event, arg) {
				if (instance.actionExists(arg.action)) {
					var act = instance.dispatchAction({ process: arg.process, target: _electron.remote.getCurrentWindow().id }, arg.action, arg.payload);

					if (isPromise(act)) {
						act.then(function (data) {
							event.sender.send(channels.callback, _extends({}, arg, {
								target: _electron.remote.getCurrentWindow().id,
								data: data
							}));
						});
					} else {
						console.log('[ProcessComms] Promise was not returned');
						event.sender.send(channels.callback, _extends({}, arg, {
							target: _electron.remote.getCurrentWindow().id
						}));
					}
				} else {
					event.sender.send(channels.error, '[ProcessComms] unknown action in renderer process: ' + arg.action);
				}
			});

			// renderer error ipc listener
			_electron.ipcRenderer.on(channels.error, function (event, err) {
				console.error(err);
			});
		}

		var dispatchAction = this.dispatchAction,
		    dispatchExternalAction = this.dispatchExternalAction;

		// setup dispatchers

		this.dispatch = function boundDispatch(type, payload) {
			return dispatchAction.call(instance, {
				process: Process.type(),
				target: Process.is('renderer') ? _electron.remote.getCurrentWindow().id : null
			}, type, payload);
		};

		this.dispatchExternal = function boundDispatchExternal(target, action, payload) {
			return new Promise(function (resolve) {
				dispatchExternalAction.call(instance, target, action, payload);

				if (Process.is('main')) {
					// main callback ipc listener
					return _electron.ipcMain.once(channels.callback, function (event, arg) {
						resolve(arg.data);
					});
				} else if (Process.is('renderer')) {
					// renderer callback ipc listener
					return _electron.ipcRenderer.once(channels.callback, function (event, arg) {
						resolve(arg.data);
					});
				}
			});
		};
	}

	_createClass(ProcessComms, [{
		key: 'actionExists',
		value: function actionExists(action) {
			return !!this._actions[action];
		}
	}, {
		key: 'dispatchExternalAction',
		value: function dispatchExternalAction(_target, _action, _payload) {
			var arg = {
				process: Process.type()
			};

			if (Process.is('main')) {
				// xor with ternary
				if ((typeof _target === 'undefined' ? 'undefined' : _typeof(_target)) === 'object' ? !(typeof _target === 'number') : typeof _target === 'number') {
					console.error('[ProcessComms] target BrowserWindow or BrowserWindow id not passed as parameter');
					return;
				}

				_target = (typeof _target === 'undefined' ? 'undefined' : _typeof(_target)) === 'object' ? _target.webContents.id : _target;

				if (typeof _action !== 'string') {
					console.error('[ProcessComms] action not passed as parameter');
					return;
				}

				if (typeof _payload !== 'undefined') {
					arg.payload = _payload;
				}
				_electron.webContents.fromId(_target).send(channels.call, _extends({}, arg, {
					action: _action,
					target: _target
				}));
			} else if (Process.is('renderer')) {
				if (typeof _target !== 'string') {
					console.error('[ProcessComms] action not passed as parameter');
					return;
				}

				if (typeof _action !== 'undefined') {
					arg.payload = _action;
				}

				_electron.ipcRenderer.send(channels.call, _extends({}, arg, {
					action: _target,
					target: _electron.remote.getCurrentWindow().id
				}));
			}
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
				// show the error in the log from where it was called from
				if (_caller.process === Process.type()) {
					console.error('[ProcessComms] unknown action: ' + action);
				}
				return;
			}

			// return a promise of the action, passing in the payload
			return entry.length > 1 ? Promise.all(entry.map(function (handler) {
				return handler(payload);
			})) : entry[0](payload);
		}
	}, {
		key: 'registerAction',
		value: function registerAction(action, handler) {
			var instance = this;

			var entry = Array.isArray(instance._actions[action]) ? instance._actions[action] : instance._actions[action] = [];

			entry.push(function (payload, cb) {
				var res = handler({
					dispatch: instance.dispatch,
					dispatchExternal: instance.dispatchExternal
				}, payload, cb);

				if (!isPromise(res)) {
					res = Promise.resolve(res);
				}

				return res;
			});
		}
	}]);

	return ProcessComms;
}();

exports.default = ProcessComms;
//# sourceMappingURL=index.js.map