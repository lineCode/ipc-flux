const IpcFlux = require('../build/index.js').default;

const ipcFlux = new IpcFlux({
	actions: {
		action1: ({dispatchExternal}) => {
			dispatchExternal('action1');
		},
		action2: () => {
			document.getElementById('click').style.backgroundColor = 'green';
			setTimeout(() => {
				document.getElementById('click').style.backgroundColor = 'red';
			}, 100);
		}
	}
});

document.getElementById('click').addEventListener('click', () => {
	ipcFlux.dispatch('action1');
});
