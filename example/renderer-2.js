const IpcFlux = require('../build/index.js').default;

const ipcFlux = new IpcFlux({
	actions: {
		action1: ({ dispatch }) => {
			dispatch('main', 'action2');
		},
		action2: () => {
			document.getElementById('click').style.backgroundColor = 'yellow';
			setTimeout(() => {
				document.getElementById('click').style.backgroundColor = 'blue';
			}, 100);
		}
	}
});

document.getElementById('click').addEventListener('click', () => {
	ipcFlux.dispatch('main', 'action2');
});