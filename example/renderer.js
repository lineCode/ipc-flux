const ProcessComms = require('../build/index.js').default

const processComms = new ProcessComms({
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

processComms.dispatch('action5')
processComms.dispatchExternal('action2')