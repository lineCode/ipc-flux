describe('Renderer Process', () => {
	it('instance created on `new`', () => {
		const ipcFlux = new IpcFlux();
		expect(ipcFlux instanceof IpcFlux).to.be.true;
	});

	it('correct running process identified', () => {
		const ipcFlux = new IpcFlux();
		expect(ipcFlux.debug.process).to.equal('renderer');
	});

	it('registerAction adds action to ipcFlux', () => {
		const ipcFlux = new IpcFlux();

		ipcFlux.registerAction('action1', () => {
			return 'action1';
		});

		ipcFlux.dispatch('action1').then((data) => {
			expect(data).to.equal('action1');
		});
	});

	it('actions can be dispatched locally', () => {
		const ipcFlux = new IpcFlux({
			actions: {
				action1: () => {
					return 'action1';
				}
			}
		});

		ipcFlux.dispatch('action1').then((data) => {
			expect(data).to.equal('action1');
		});
	});

	it('actions can be dispatched locally with dispatch param', () => {
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
		});
	});

	it('actions can be dispatched locally with payload', () => {
		const ipcFlux = new IpcFlux({
			actions: {
				action1: ({}, payload) => {
					return payload;
				}
			}
		});

		ipcFlux.dispatch('action1', 'hello').then((data) => {
			expect(data).to.equal('hello');
		});
	});

	it('actions can be dispatched locally with both dispatch param and payload', () => {
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
		});
	});

	it('chain of actions and dispatches return expected result', () => {
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
});