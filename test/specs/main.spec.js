describe('Main', () => {
	describe('setup', () => {
		it('instance created on `new`', () => {
			const ipcFlux = new IpcFlux();
			expect(ipcFlux instanceof IpcFlux).to.be.true;
		});

		it('correct running process identified', () => {
			const ipcFlux = new IpcFlux();
			expect(ipcFlux.debug.process).to.equal('main');
		});

		it('registerAction adds action to ipcFlux', (done) => {
			const ipcFlux = new IpcFlux();

			ipcFlux.registerAction('action1', () => {
				return 'action1';
			});

			ipcFlux.dispatch('local', 'action1').should.eventually.equal('action1').notify(done);
		});
	});

	describe('dispatch', () => {
		describe('local', () => {
			it('dispatch', () => {
				const ipcFlux = new IpcFlux({
					actions: {
						action1: () => {
							return 'action1';
						}
					}
				});

				ipcFlux.dispatch('local', 'action1').then((data) => {
					expect(data).to.equal('action1');
				});
			});

			it('dispatch ({ dispatch })', () => {
				const ipcFlux = new IpcFlux({
					actions: {
						action1: ({ dispatch }) => {
							return dispatch('local', 'action2');
						},
						action2: () => {
							return 'action2';
						}
					}
				});

				ipcFlux.dispatch('local', 'action1').then((data) => {
					expect(data).to.equal('action2');
				});
			});

			it('dispatch ({}, payload)', () => {
				const ipcFlux = new IpcFlux({
					actions: {
						action1: ({}, payload) => {
							return payload;
						}
					}
				});

				ipcFlux.dispatch('local', 'action1', 'hello').then((data) => {
					expect(data).to.equal('hello');
				});
			});

			it('dispatch ({ dispatch }, payload)', () => {
				const ipcFlux = new IpcFlux({
					actions: {
						action1: ({ dispatch }, payload) => {
							return dispatch('local', 'action2', payload);
						},
						action2: ({}, payload) => {
							return payload;
						}
					}
				});

				ipcFlux.dispatch('local', 'action1', 'hello').then((data) => {
					expect(data).to.equal('hello');
				});
			});

			it('dispatch (chain)', () => {
				const ipcFlux = new IpcFlux({
					actions: {
						action1: ({ dispatch }, payload) => {
							return dispatch('local', 'action2', payload);
						},
						action2: ({ dispatch }, payload) => {
							return dispatch('local', 'action3', payload);
						},
						action3: ({ dispatch }, payload) => {
							return dispatch('local', 'action4', payload);
						},
						action4: ({ dispatch }, payload) => {
							return dispatch('local', 'action5', payload);
						},
						action5: ({ dispatch }, payload) => {
							return payload;
						}
					}
				});

				ipcFlux.dispatch('local', 'action1', 'chain dispatch').then((data) => {
					expect(data).to.equal('chain dispatch');
				});
			});

			it('dispatch simultaneous', (done) => {
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

				ipcFlux.dispatch('local', 'action1').then((data) => {
					expect(data).to.equal('action1');
					done();
				});

				ipcFlux.dispatch('local', 'action2').then((data) => {
					expect(data).to.equal('action2');
				});
			});
		});
	});
});