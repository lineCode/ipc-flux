const rendererWindowId = 1;

const IpcFlux = require('../build/index.js').default;
const ipcFlux = new IpcFlux({
	actions: {
		action1: () => {
			return 'action1 main';
		},
		action2: ({ dispatch }) => {
			return dispatch('action1');
		},
		action3: ({ dispatchExternal }) => {
			return dispatchExternal(rendererWindowId, 'action1');
		},
		actions3point5: ({}, payload) => {
			return payload;
		},
		action4: ({ dispatch }, payload) => {
			return dispatch('actions3point5', payload);
		},
		action5: ({ dispatchExternal }, payload) => {
			return dispatchExternal(rendererWindowId, 'action1', payload);
		},
		action6: ({ dispatch, dispatchExternal }, payload) => {
			return new Promise((resolve) => {
				dispatchExternal(rendererWindowId, 'action1', payload).then((data) => {
					return dispatch('actions3point5', data);
				}).then((data) => {
					resolve(data + payload);
				});
			});
		},
		chainDispatch: ({ dispatch, dispatchExternal }) => {
			return dispatch('chainDispatch1');
		},
		chainDispatch1: ({ dispatch, dispatchExternal }) => {
			return dispatch('chainDispatch2');
		},
		chainDispatch2: ({ dispatch, dispatchExternal }) => {
			return dispatch('chainDispatch3');
		},
		chainDispatch3: ({ dispatch, dispatchExternal }) => {
			return 'chain dispatch';
		},
	}
});