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
	state: 'IpcFlux-State',
	processes: 'IpcFlux-Processes'
};

// remove all existing IpcFlux listeners
var removeExistingListeners = function removeExistingListeners() {
	Object.values(channels).forEach(function (channel) {
		Process.emitter().removeAllListeners(channel);
	});
};

var checkActiveInstance = function checkActiveInstance(check) {
	return _electron.webContents.getAllWebContents().map(function (contents) {
		return contents.id;
	}).indexOf(check) >= 0;
};

var genCallbackId = function genCallbackId() {
	return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

var IpcFlux = function () {
	function IpcFlux() {
		var _this = this;

		var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

		_classCallCheck(this, IpcFlux);

		global.flux = this;

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
		    _options$config = options.config,
		    config = _options$config === undefined ? {} : _options$config,
		    state = options.state;

		// check if state is defined or is an object with something in it

		assert((state !== undefined || (typeof state === 'undefined' ? 'undefined' : _typeof(state)) === 'object' && Object.keys(state).length > 0) && Process.is('renderer'), 'initial state must be declared in main process');

		// defined due to `this` being reassigned in arrow functions
		var flux = this;

		// window reference id, if no custom id is specified, use the browserWindow id or 'main'
		this._id = Process.is('renderer') ? id || _electron.remote.getCurrentWindow().id : 'main';

		// define globs used throughout
		this._committing = false;
		this._actions = Object.create(null);
		this._mutations = Object.create(null);

		this._instances = {};

		// state still needs to be defined within renderer instances, just not from initial config, hence the assert above
		this.state = Process.is('main') ? _extends({}, state) : {};

		if (Process.is('renderer')) {
			new Promise(function (resolve, reject) {
				_electron.ipcRenderer.on(channels.processes, function (event, arg) {
					resolve(arg.state);
				});
			}).then(function (state) {
				flux.state = state;
			});
		}

		this._config = _extends({
			maxListeners: 50,
			debug: false
		}, config);

		// define the process emitter, minimizes code duplication
		var emitter = Process.is('main') ? _electron.ipcMain : _electron.ipcRenderer;
		emitter.setMaxListeners(this._config.maxListeners);

		var eventHandlers = {
			action: function action(event, arg) {
				if (arg.target === 'main' || Process.is('renderer')) {
					if (flux.actionExists(arg.action)) {
						var act = Process.is('renderer') ? flux.dispatch('local', arg.action, arg.payload) : dispatch.call(flux, arg.target, arg.action, arg.payload);

						if (isPromise(act)) {
							act.then(function (data) {
								event.sender.send(channels.callback, _extends({}, arg, {
									data: data
								}));
							});
						} else {
							event.sender.send(channels.error, '[IpcFlux] \'' + arg.action + '\' action called from ' + arg.process + ' process, in ' + Process.type() + ' process, did not return a Promise');
							event.sender.send(channels.callback, _extends({}, arg, {
								target: target
							}));
						}
					}
				} else {
					var _target2 = typeof arg.target === 'string' ? flux._instances[arg.target] : arg.target;
					var cbid = arg.callback;

					if (!checkActiveInstance(_target2)) {
						return;
					}

					_electron.webContents.fromId(_target2).send(channels.call, _extends({}, arg));

					var _act = new Promise(function (resolve) {
						var listener = function listener(event, arg) {
							if (arg.target === _target2 && arg.callback === cbid) {
								_electron.ipcMain.removeListener(channels.callback, listener);
								resolve(arg.data);
							}
						};

						_electron.ipcMain.on(channels.callback, listener);
					});

					_act.then(function (data) {
						event.sender.send(channels.callback, _extends({}, arg, {
							data: data
						}));
					});
				}
			},
			mutation: function mutation(event, arg) {
				if (flux.mutationExists(arg.mutation)) {
					commit.call(flux, arg.mutation, arg.payload);
				}
			}
		};

		// because a single channel (`channel.call`) is used for all callers, route different calls to their respected handler
		emitter.on(channels.call, function (event, arg) {
			if ((typeof arg === 'undefined' ? 'undefined' : _typeof(arg)) !== 'object') {
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
		});

		// state handler
		emitter.on(channels.state, function (event, arg) {
			if (Process.is('main')) {
				flux.state = arg.state;

				Object.values(flux._instances).forEach(function (target) {
					_electron.webContents.fromId(target).send(channels.state, { state: flux.state });
				});
			} else {
				flux.state = arg.state;
			}
		});

		var defineInstances = function defineInstances() {
			if (Process.is('main')) {
				_electron.ipcMain.on(channels.processes, function (event, arg) {
					if (arg.kill === true) {
						delete flux._instances[arg.uid];
					} else if (arg.uid === 'main' || arg.uid === 'local') {
						event.sender.send(channels.error, '[IpcFlux] instance id cannot be \'main\' or \'local\' (BrowserWindow: ' + arg.id + ')');
					} else if (flux._instances[arg.uid]) {
						event.sender.send(channels.error, '[IpcFlux] instance id \'' + arg.uid + '\' already defined (BrowserWindow: ' + arg.id + ')');
					} else {
						flux._instances[arg.uid] = arg.id;

						event.sender.send(channels.processes, {
							state: flux.state
						});
					}
				});
			} else {
				_electron.ipcRenderer.send(channels.processes, {
					uid: flux._id,
					id: _electron.remote.getCurrentWindow().id || null
				});
			}
		};

		defineInstances();

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
		    commit = this.commit;


		this.dispatch = function (target, type, payload) {
			if (target === 'local' || !Process.is('main') && target === _electron.remote.getCurrentWindow().id) {
				return dispatch.call(flux, target, type, payload);
			} else {
				var cbid = genCallbackId();

				dispatch.call(flux, target, type, payload, cbid);

				return new Promise(function (resolve) {
					// only resolve if the action callback is the same as that called, then remove the callback handler
					var listener = function listener(event, arg) {
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

		this.commit = function (mutation, payload, options) {
			commit.call(flux, mutation, payload, options);
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
			channels: channels,
			kill: function kill() {
				if (Process.is('renderer')) {
					_electron.ipcRenderer.send(channels.processes, {
						kill: true,
						uid: flux._id,
						id: _electron.remote.getCurrentWindow().id || null
					});
				}
			}
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
		value: function dispatch(_target, _action, _payload, _cbid) {
			var flux = this;

			var _target$action$payloa = {
				target: _target,
				action: _action,
				payload: _payload,
				cbid: _cbid
			},
			    target = _target$action$payloa.target,
			    action = _target$action$payloa.action,
			    payload = _target$action$payloa.payload,
			    cbid = _target$action$payloa.cbid;


			if (target === 'local' || Process.is('main') && target === 'main' || !Process.is('main') && target === _electron.remote.getCurrentWindow().id) {
				var entry = this._actions[action];

				if (!entry) {
					console.error('[IpcFlux] unknown action: ' + action);
					return;
				}

				return entry.length > 1 ? Promise.all(entry.map(function (handler) {
					return handler(payload);
				})) : entry[0](payload);
			} else {
				var arg = {
					process: Process.type(),
					caller: Process.is('renderer') ? _electron.remote.getCurrentWindow().id : 'main',
					callType: 'action'
				};

				var _id = (typeof target === 'number' ? target : typeof target === 'string' ? target : null) || null;

				if (_id === null) {
					console.error('[IpcFlux] target passed as parameter was not BrowserWindow id or a valid ipc-flux reference id');
					return;
				}

				if (!Process.is('renderer') && !checkActiveInstance(_id)) {
					return;
				}

				var emitter = Process.is('main') ? _electron.webContents.fromId(_id).webContents : _electron.ipcRenderer;

				emitter.send(channels.call, _extends({}, arg, {
					action: action,
					payload: payload,
					target: _id,
					callback: cbid
				}));
			}
		}
	}, {
		key: 'commit',
		value: function commit(_type, _payload, _options) {
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
					commit: flux.commit,
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
		key: '_withCommit',
		value: function _withCommit(fn) {
			var flux = this;

			var committing = this._committing;
			this._committing = true;
			fn();
			this._committing = committing;

			if (Process.is('main')) {
				Object.values(flux._instances).forEach(function (target) {
					_electron.webContents.fromId(target).send(channels.state, { state: flux.state });
				});
			} else {
				_electron.ipcRenderer.send(channels.state, { state: flux.state });
			}
		}
	}, {
		key: 'replaceState',
		value: function replaceState(state) {
			var flux = this;

			this._withCommit(function () {
				flux.state = state;
			});
		}
	}]);

	return IpcFlux;
}();

exports.default = IpcFlux;