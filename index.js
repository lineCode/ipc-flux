// electron-process-comms

import electron from 'electron'

// determines process originating from
const Process = {
	type: () => {
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
	is: (type) => {
		if (typeof type === 'string') {
			return type === this.type()
		} else {
			throw new TypeError('type of `type` was not string')
		}
	}
}

export default {

}