'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _electron = require('electron');

var isPromise = function isPromise(val) {
	return val && typeof val.then === 'function';
};

var assert = function assert(condition, msg) {
	if (condition) {
		throw new Error('[IpcFlux] ' + msg);
	}
};

// determines process originating from
var Process = {
	// return the type of process as a string
	type: function type() {
		// running in browser/electron window
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
	// explicit process type checking
	is: function is(type) {
		return type === Process.type();
	},
	emitter: function emitter() {
		return Process.is('main') ? _electron.ipcMain : _electron.ipcRenderer;
	},
	// environment checking
	env: {
		type: function type() {
			if (typeof process === 'undefined') {
				return '';
			}

			if ((typeof process === 'undefined' ? 'undefined' : _typeof(process)) !== 'object') {
				return '';
			}

			if (_typeof(process.env) !== 'object') {
				return '';
			}

			if (typeof process.env.NODE_ENV === 'undefined') {
				return '';
			}

			return process.env.NODE_ENV;
		},
		is: function is(type) {
			return type === Process.env.type();
		}
	}
};

exports.default = {
	isPromise: isPromise,
	assert: assert,
	Process: Process
};
//# sourceMappingURL=utils.js.map