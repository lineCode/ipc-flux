const { expect, should, assert } = require('chai');

import ProcessComms from '../index.js';

const processComms = new ProcessComms({
	actions: {
		// no dispatchers, no payload
		rendererTest1: () => {
			return 'rendererTest1'
		},
		// dispatcher, no payload
		rendererTest2: ({ dispatch }) => {
			return 'rendererTest2'
		},
		// externalDispatcher, no payload
		rendererTest3: ({ dispatchExternal }) => {
			return 'rendererTest3'
		},
		// dispatchers, no payload
		rendererTest4: ({ dispatch, dispatchExternal }) => {
			return 'rendererTest4'
		},
		// no dispatchers, payload
		rendererTest5: ({}, payload) => {
			return 'rendererTest5'
		},
		// dispatcher, payload
		rendererTest6: ({ dispatch }, payload) => {
			return 'rendererTest6'
		},
		// externalDispatcher, payload
		rendererTest7: ({ dispatchExternal }, payload) => {
			return 'rendererTest7'
		},
		// dispatchers, payload
		rendererTest8: ({ dispatch, dispatchExternal }, payload) => {
			return 'rendererTest8'
		}
	}
});

describe('Renderer actions', () => {
	it('test 1', () => {
		processComms.dispatchExternal('mainTest1').then((data) => {
			console.log(typeof data)
			expect(data).to.be.equal('mainTest1');
		});

		return processComms.dispatch('rendererTest1').then((data) => {
			expect(data).to.equal('rendererTest1');
		});
	});

	it('test 2', () => {
		return processComms.dispatch('rendererTest2').then((data) => {
			expect(data).to.equal('rendererTest2');
		});
	});

	it('test 3', () => {
		return processComms.dispatch('rendererTest3').then((data) => {
			expect(data).to.equal('rendererTest3');
		});
	});

	it('test 4', () => {
		return processComms.dispatch('rendererTest4').then((data) => {
			expect(data).to.equal('rendererTest4');
		});
	});

	it('test 5', () => {
		return processComms.dispatch('rendererTest5').then((data) => {
			expect(data).to.equal('rendererTest5');
		});
	});

	it('test 6', () => {
		return processComms.dispatch('rendererTest6').then((data) => {
			expect(data).to.equal('rendererTest6');
		});
	});

	it('test 7', () => {
		return processComms.dispatch('rendererTest7').then((data) => {
			expect(data).to.equal('rendererTest7');
		});
	});

	it('test 8', () => {
		return processComms.dispatch('rendererTest8').then((data) => {
			expect(data).to.equal('rendererTest8');
		});
	});
});
