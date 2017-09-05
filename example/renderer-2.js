const IpcFlux = require('../build/index.js').default;

const ipcFlux = new IpcFlux({
	actions: {
		action1: ({dispatchExternal}) => {
			dispatchExternal('action2');
		},
		action2: () => {
			document.getElementById('click').style.backgroundColor = 'yellow';
			setTimeout(() => {
				document.getElementById('click').style.backgroundColor = 'blue';
			}, 100);
		}
	},
	mutations: {
		mutation1: () => {
			console.log('hi');
		}
	}
});

document.getElementById('click').addEventListener('click', () => {
	ipcFlux.dispatch('action1');
	ipcFlux.commitExternal('mutation1');
	ipcFlux.commit('mutation1');
});