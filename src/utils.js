const isPromise = (val) => {
	return val && typeof val.then === 'function';
}

const assert = (condition, msg) => {
	if (!condition) {
		throw new Error(`[IpcFlux] ${msg}`);
	}
}

Promise.prototype.fulfilled = function () {
	let status = {
		pending: true,
		rejected: false,
		fulfilled: false
	};

	const result = this.then((v) => {
		status.fulfilled = true;
		status.pending = false;
		return v;
	}, (e) => {
		status.rejected = true;
		status.pending = false;
		throw e;
	});

	return status.fulfilled;
}

Promise.prototype.pending = function () {
	let status = {
		pending: true,
		rejected: false,
		fulfilled: false
	};

	const result = this.then((v) => {
		status.fulfilled = true;
		status.pending = false;
		return v;
	}, (e) => {
		status.rejected = true;
		status.pending = false;
		throw e;
	});

	return status.pending;
}

Promise.prototype.rejected = function () {
	let status = {
		pending: true,
		rejected: false,
		fulfilled: false
	};

	const result = this.then((v) => {
		status.fulfilled = true;
		status.pending = false;
		return v;
	}, (e) => {
		status.rejected = true;
		status.pending = false;
		throw e;
	});

	return status.rejected;
}

function MakeQuerablePromise(promise) {
    // Don't modify any promise that has been already modified.
    if (promise.isResolved) return promise;

    // Set initial state
    var isPending = true;
    var isRejected = false;
    var isFulfilled = false;

    // Observe the promise, saving the fulfillment in a closure scope.
    var result = promise.then(
        function(v) {
            isFulfilled = true;
            isPending = false;
            return v;
        },
        function(e) {
            isRejected = true;
            isPending = false;
            throw e;
        }
    );

    result.isFulfilled = function() { return isFulfilled; };
    result.isPending = function() { return isPending; };
    result.isRejected = function() { return isRejected; };
    return result;
}

// determines process originating from
const Process = {
	// return the type of process as a string
	type: () => {
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
	is: (type) => {
		return type === Process.type();
	},
	// environment checking
	env: {
		type: () => {
			if (typeof process === 'undefined') {
				return '';
			}

			if (typeof process !== 'object') {
				return '';
			}

			if (typeof process.env !== 'object') {
				return '';
			}

			if (typeof process.env.NODE_ENV === 'undefined') {
				return '';
			}

			return process.env.NODE_ENV
		},
		is: (type) => {
			return type === Process.env.type();
		}
	}
}

export default {
	isPromise,
	assert,
	Process
}