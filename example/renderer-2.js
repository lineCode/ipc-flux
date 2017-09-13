const IpcFlux = require('../build/index.js').default;

const ipcFlux = new IpcFlux({
	id: 'b',
	actions: {
		coloryb: () => {
			document.getElementById('click').style.backgroundColor = 'yellow';
			setTimeout(() => {
				document.getElementById('click').style.backgroundColor = 'blue';
			}, 100);
		}
	}
});

document.getElementById('click').addEventListener('click', () => {
	ipcFlux.dispatch(1, 'colorgr');
});