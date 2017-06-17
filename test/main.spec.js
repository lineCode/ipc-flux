const { expect, should, assert } = require('chai');

import ProcessComms from '../index.js';

const processComms = new ProcessComms({
	actions: {
		// no dispatchers, no payload
		mainTest1: () => {
			return 'mainTest1'
		},
		// dispatcher, no payload
		mainTest2: ({ dispatch }) => {
			return 'mainTest2'
		},
		// externalDispatcher, no payload
		mainTest3: ({ dispatchExternal }) => {
			return 'mainTest3'
		},
		// dispatchers, no payload
		mainTest4: ({ dispatch, dispatchExternal }) => {
			return 'mainTest4'
		},
		// no dispatchers, payload
		mainTest5: ({}, payload) => {
			return 'mainTest5'
		},
		// dispatcher, payload
		mainTest6: ({ dispatch }, payload) => {
			return 'mainTest6'
		},
		// externalDispatcher, payload
		mainTest7: ({ dispatchExternal }, payload) => {
			return 'mainTest7'
		},
		// dispatchers, payload
		mainTest8: ({ dispatch, dispatchExternal }, payload) => {
			return 'mainTest8'
		}
	}
});

describe('Main actions', () => {
	it('test 1', () => {

		processComms.dispatchExternal('rendererTest1').then((data) => {
			console.log(data)
			expect(data).to.be.equal('rendererTest1');
		});

		processComms.dispatch('mainTest1').then((data) => {
			expect(data).to.equal('mainTest1');
		});
	});

	it('test 2', () => {
		return processComms.dispatch('mainTest2').then((data) => {
			expect(data).to.equal('mainTest2');
		});
	});

	it('test 3', () => {
		return processComms.dispatch('mainTest3').then((data) => {
			expect(data).to.equal('mainTest3');
		});
	});

	it('test 4', () => {
		return processComms.dispatch('mainTest4').then((data) => {
			expect(data).to.equal('mainTest4');
		});
	});

	it('test 5', () => {
		return processComms.dispatch('mainTest5').then((data) => {
			expect(data).to.equal('mainTest5');
		});
	});

	it('test 6', () => {
		return processComms.dispatch('mainTest6').then((data) => {
			expect(data).to.equal('mainTest6');
		});
	});

	it('test 7', () => {
		return processComms.dispatch('mainTest7').then((data) => {
			expect(data).to.equal('mainTest7');
		});
	});

	it('test 8', () => {
		return processComms.dispatch('mainTest8').then((data) => {
			expect(data).to.equal('mainTest8');
		});
	});
});
