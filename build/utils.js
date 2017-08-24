'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var isPromise = function isPromise(val) {
	return val && typeof val.then === 'function';
};

var assert = function assert(condition, msg) {
	if (!condition) {
		throw new Error('[IpcFlux] ' + msg);
	}
};

Promise.prototype.fulfilled = function () {
	var status = {
		pending: true,
		rejected: false,
		fulfilled: false
	};

	var result = this.then(function (v) {
		status.fulfilled = true;
		status.pending = false;
		return v;
	}, function (e) {
		status.rejected = true;
		status.pending = false;
		throw e;
	});

	return status.fulfilled;
};

Promise.prototype.pending = function () {
	var status = {
		pending: true,
		rejected: false,
		fulfilled: false
	};

	var result = this.then(function (v) {
		status.fulfilled = true;
		status.pending = false;
		return v;
	}, function (e) {
		status.rejected = true;
		status.pending = false;
		throw e;
	});

	return status.pending;
};

Promise.prototype.rejected = function () {
	var status = {
		pending: true,
		rejected: false,
		fulfilled: false
	};

	var result = this.then(function (v) {
		status.fulfilled = true;
		status.pending = false;
		return v;
	}, function (e) {
		status.rejected = true;
		status.pending = false;
		throw e;
	});

	return status.rejected;
};

function MakeQuerablePromise(promise) {
	// Don't modify any promise that has been already modified.
	if (promise.isResolved) return promise;

	// Set initial state
	var isPending = true;
	var isRejected = false;
	var isFulfilled = false;

	// Observe the promise, saving the fulfillment in a closure scope.
	var result = promise.then(function (v) {
		isFulfilled = true;
		isPending = false;
		return v;
	}, function (e) {
		isRejected = true;
		isPending = false;
		throw e;
	});

	result.isFulfilled = function () {
		return isFulfilled;
	};
	result.isPending = function () {
		return isPending;
	};
	result.isRejected = function () {
		return isRejected;
	};
	return result;
}

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