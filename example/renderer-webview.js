const IpcFlux = require('../build/index.js').default;

const ipcFlux = new IpcFlux({
	actions: {
		action1: ({dispatchExternal}) => {
			dispatchExternal('action3');
		},
		action2: () => {
			console.log('externally dispatched');
		}
	}
});

setTimeout(() => {
	ipcFlux.dispatch('action1');
}, 500);