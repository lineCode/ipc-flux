const IpcFlux = require('../build/index.js').default;

const ipcFlux = new IpcFlux({
	id: 'a',
	actions: {
		colorgr: () => {
			document.getElementById('click').style.backgroundColor = 'green';
			setTimeout(() => {
				document.getElementById('click').style.backgroundColor = 'red';
			}, 100);
		}
	}
});

document.getElementById('click').addEventListener('click', () => {
	ipcFlux.dispatch(2, 'coloryb');
});
