describe('Renderer Process', () => {
	it('instance created on `new`', () => {
		const ipcFlux = new IpcFlux();
		expect(ipcFlux instanceof IpcFlux).to.be.true;
	});

	it('correct running process identified', () => {
		const ipcFlux = new IpcFlux();
		expect(ipcFlux.debug.process).to.equal('renderer');
	});

	it('registerAction adds action to ipcFlux', (done) => {
		const ipcFlux = new IpcFlux();

		ipcFlux.registerAction('action1', () => {
			return 'action1';
		});

		ipcFlux.dispatch('action1').then((data) => {
			expect(data).to.equal('action1');
			done();
		});
	});

	it('actions can be dispatched locally', (done) => {
		const ipcFlux = new IpcFlux({
			actions: {
				action1: () => {
					return 'action1';
				}
			}
		});

		ipcFlux.dispatch('action1').then((data) => {
			expect(data).to.equal('action1');
			done();
		});
	});

	it('actions can be dispatched locally with dispatch param', (done) => {
		const ipcFlux = new IpcFlux({
			actions: {
				action1: ({ dispatch }) => {
					return dispatch('action2')
				},
				action2: () => {
					return 'action2';
				}
			}
		});

		ipcFlux.dispatch('action1').then((data) => {
			expect(data).to.equal('action2');
			done();
		});
	});

	it('actions can be dispatched locally with payload', (done) => {
		const ipcFlux = new IpcFlux({
			actions: {
				action1: ({}, payload) => {
					return payload;
				}
			}
		});

		ipcFlux.dispatch('action1', 'hello').then((data) => {
			expect(data).to.equal('hello');
			done();
		});
	});

	it('actions can be dispatched locally with both dispatch param and payload', (done) => {
		const ipcFlux = new IpcFlux({
			actions: {
				action1: ({ dispatch }, payload) => {
					return dispatch('action2', payload);
				},
				action2: ({}, payload) => {
					return payload;
				}
			}
		});

		ipcFlux.dispatch('action1', 'hello').then((data) => {
			expect(data).to.equal('hello');
			done();
		});
	});

	it('chain of actions and dispatches return expected result', (done) => {
		const ipcFlux = new IpcFlux({
			actions: {
				action1: ({ dispatch }, payload) => {
					return dispatch('action2', payload);
				},
				action2: ({ dispatch }, payload) => {
					return dispatch('action3', payload);
				},
				action3: ({ dispatch }, payload) => {
					return dispatch('action4', payload);
				},
				action4: ({ dispatch }, payload) => {
					return dispatch('action5', payload);
				},
				action5: ({ dispatch }, payload) => {
					return payload;
				}
			}
		});

		ipcFlux.dispatch('action1', 'chain dispatch').then((data) => {
			expect(data).to.equal('chain dispatch');
			done();
		});
	});

	it('multiple dispatches return expected result', (done) => {
		const ipcFlux = new IpcFlux({
			actions: {
				action1: () => {
					return new Promise((resolve) => {
						setTimeout(() => {
							resolve('action1');
						}, 100);
					});
				},
				action2: () => {
					return 'action2';
				}
			}
		});

		ipcFlux.dispatch('action1').then((data) => {
			expect(data).to.equal('action1');
			done();
		});

		ipcFlux.dispatch('action2').then((data) => {
			expect(data).to.equal('action2');
		});
	});

	it('actions can be dispatched externally (renderer --> main)', (done) => {
		const ipcFlux = new IpcFlux();
		ipcFlux.dispatchExternal('action1').then((data) => {
			expect(data).to.equal('action1 main');
			done();
		});
	});

	it('actions can be dispatched externally (renderer --> main) with dispatch param', (done) => {
		const ipcFlux = new IpcFlux({
			actions: {
				action1: () => {
					return 'action1 renderer';
				}
			}
		});

		ipcFlux.dispatchExternal('action2').then((data) => {
			expect(data).to.equal('action1 main');
			done();
		});
	});

	it('actions can be dispatched externally (renderer --> main) with dispatchExternal param', (done) => {
		const ipcFlux = new IpcFlux({
			actions: {
				action1: () => {
					return 'action1 renderer';
				}
			}
		});

		ipcFlux.dispatchExternal('action3').then((data) => {
			expect(data).to.equal('action1 renderer');
			done();
		});
	});

	it('actions can be dispatched externally (renderer --> main) with dispatch param and payload', (done) => {
		const ipcFlux = new IpcFlux({
			actions: {
				action1: () => {
					return 'action1 renderer';
				}
			}
		});

		ipcFlux.dispatchExternal('action4', 'payload').then((data) => {
			expect(data).to.equal('payload');
			done();
		});
	});

	it('actions can be dispatched externally (renderer --> main) with dispatchExternal param and payload', (done) => {
		const ipcFlux = new IpcFlux({
			actions: {
				action1: ({}, payload) => {
					return payload;
				}
			}
		});

		ipcFlux.dispatchExternal('action5', 'payload').then((data) => {
			expect(data).to.equal('payload');
			done();
		});
	});

	it('actions can be dispatched externally (renderer --> main) with dispatch, dispatchExternal param and payload', (done) => {
		const ipcFlux = new IpcFlux({
			actions: {
				action1: ({}, payload) => {
					return payload;
				}
			}
		});

		ipcFlux.dispatchExternal('action6', 'payload').then((data) => {
			expect(data).to.equal('payloadpayload');
			done();
		});
	});
});