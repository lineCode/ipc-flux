const IpcFlux = require('../build/index.js').default;

const ipcFlux = new IpcFlux({
	actions: {
		action4: () => {
			console.log('\n\nrenderer-process::action4\n\n')
		},
		action5: () => {
			console.log('\n\nrenderer-process::action5\n\n')
		},
		action6: () => {
			console.log('\n\nrenderer-process::action6\n\n')
		}
	}
})

ipcFlux.dispatch('action5')
ipcFlux.dispatchExternal('action2')

setInterval(() => {
	console.log(ipcFlux.handshakePromise)
}, 50);