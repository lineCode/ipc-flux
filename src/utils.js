const isPromise = (val) => {
	return val && typeof val.then === 'function';
}

const assert = (condition, msg) => {
	if (!condition) {
		throw new Error(`[IpcFlux] ${msg}`);
	}
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