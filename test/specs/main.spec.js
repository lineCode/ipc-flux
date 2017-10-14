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
			it('dispatch', (done) => {
				const ipcFlux = new IpcFlux({
					actions: {
						action1: () => {
							return 'action1';
						}
					}
				});

				ipcFlux.dispatch('local', 'action1').should.eventually.equal('action1').notify(done);
			});

			it('dispatch ({ dispatch })', (done) => {
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

				ipcFlux.dispatch('local', 'action1').should.eventually.equal('action2').notify(done);
			});

			it('dispatch ({}, payload)', (done) => {
				const ipcFlux = new IpcFlux({
					actions: {
						action1: ({}, payload) => {
							return payload;
						}
					}
				});

				ipcFlux.dispatch('local', 'action1', 'hello').should.eventually.equal('hello').notify(done);
			});

			it('dispatch ({ dispatch }, payload)', (done) => {
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

				ipcFlux.dispatch('local', 'action1', 'hello').should.eventually.equal('hello').notify(done);
			});

			it('dispatch (chain)', (done) => {
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

				ipcFlux.dispatch('local', 'action1', 'chain dispatch').should.eventually.equal('chain dispatch').notify(done);
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

				ipcFlux.dispatch('local', 'action1').should.eventually.equal('action1').notify(done);

				ipcFlux.dispatch('local', 'action2').should.eventually.equal('action2');
			});
		});

		describe('main --> renderer', () => {
			it('dispatch', (done) => {
				const ipcFlux = new IpcFlux();

				setTimeout(() => {
					ipcFlux.dispatch(1, 'action1').should.eventually.equal('action1 renderer').notify(done);
				}, 150);
			});

			it('dispatch ({ dispatch })', (done) => {
				const ipcFlux = new IpcFlux();

				ipcFlux.dispatch(1, 'action2').should.eventually.equal('action1 renderer').notify(done);
			});

			it('dispatch ({}, payload)', (done) => {
				const ipcFlux = new IpcFlux();

				ipcFlux.dispatch(1, 'action4', 'payload').should.eventually.equal('payload').notify(done);
			});

			it('dispatch ({ dispatch }, payload)', (done) => {
				const ipcFlux = new IpcFlux();

				ipcFlux.dispatch(1, 'action4', 'hello').should.eventually.equal('hello').notify(done);
			});

			it('dispatch (chain)', (done) => {
				const ipcFlux = new IpcFlux();

				ipcFlux.dispatch(1, 'chainDispatch', 'chain dispatch').should.eventually.equal('chain dispatch').notify(done);
			});

			it('dispatch simultaneous', (done) => {
				const ipcFlux = new IpcFlux({
					actions: {
						action1: ({ dispatch }) => {
							return new Promise((resolve) => {
								setTimeout(() => {
									resolve(dispatch(1, 'chainDispatch'));
								}, 100);
							});
						},
						action2: ({ dispatch }) => {
							return dispatch(1, 'action1');
						}
					}
				});

				ipcFlux.dispatch('local', 'action1').should.eventually.equal('chain dispatch').notify(done);

				ipcFlux.dispatch('local', 'action2').should.eventually.equal('action1 renderer');
			});
		});
	});
});