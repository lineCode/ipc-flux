// electron-process-comms

// import electron from 'electron';

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
			return type === this.type();
		} else {
			throw new TypeError('type of `type` was not string');
		}
	}
}

const isPromise = (val) => {
	return val && typeof val.then === 'function';
}

class ProcessComms {
	constructor(options = {}) {
		let { actions = {} } = options;

		this._actions = Object.create(null);

		const store = this

		Object.keys(actions).forEach((action) => {
			registerAction(store, action, actions[action], store)
		})

		const { dispatch, commit } = this;

		this.dispatch = function boundDispatch (type, payload) {
			return dispatch.call(store, type, payload);
		}
	}

	dispatch(_type, _payload) {
		const { type, payload } = {
			type: _type,
			payload: _payload
		};

		const entry = this._actions[type];

		if (!entry) {
			console.error(`unknown action type: ${type}`);
			return;
		}

		return entry.length > 1 ? Promise.all(entry.map(handler => handler(payload))) : entry[0](payload);
	}
}

const registerAction = (store, type, handler, local) => {
	const entry = store._actions[type] || (store._actions[type] = []);
	entry.push((payload, cb) => {
		let res = handler({
			dispatch: local.dispatch
		}, payload, cb);

		if (!isPromise(res)) {
			res = Promise.resolve(res);
		}

		return res
	})
}

const processComms = new ProcessComms({
	actions: {
		init: ({ dispatch }) => {
			console.log('hello')
			dispatch('init2')
		},
		init2: ({ dispatch }) => {
			console.log('bye')
		}
	}
});

processComms.dispatch('init')