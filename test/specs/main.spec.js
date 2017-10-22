describe('Main', () => {
	describe('setup', () => {
		it('instance created on `new`', () => {
			const ipcFlux = new IpcFlux();
			expect(ipcFlux instanceof IpcFlux).to.be.true;
		});

		it('identifies running process', () => {
			const ipcFlux = new IpcFlux();
			expect(ipcFlux.debug.process).to.equal('main');
		});

		it('action registered via `registerAction`', (done) => {
			const ipcFlux = new IpcFlux();

			ipcFlux.registerAction('action1', () => {
				return 'action1';
			});

			ipcFlux.dispatch('local', 'action1').should.eventually.equal('action1').notify(done);
		});

		it('setting state does not throw error', () => {
			const ipcFlux = () => {
				new IpcFlux({
					state: {
						key: 'value'
					}
				});
			};

			expect(ipcFlux).to.not.throw(Error);
		});
	});

	describe('state', () => {
		it('changes in renderer are pushed to main', (done) => {
			const ipcFlux = new IpcFlux({
				state: {
					a: 1,
					b: 2,
					c: 3
				}
			});

			setTimeout(() => {
				ipcFlux.dispatch(1, 'action7');
			}, 200);

			setTimeout(() => {
				expect(ipcFlux.state.a).to.equal(12);
				done();
			}, 350);
		});

		it('changes in main are pushed to renderer', (done) => {
			const ipcFlux = new IpcFlux({
				mutations: {
					a: (state) => {
						state.a = 4;
					}
				}
			});

			ipcFlux._instances = {'1': 1};

			setTimeout(() => {
				ipcFlux.dispatch(1, 'action8');
			}, 200);

			setTimeout(() => {
				ipcFlux.commit('a');
			}, 200);

			setTimeout(() => {
				ipcFlux.dispatch(1, 'action9', 4).should.eventually.equal(true).notify(done);
			}, 200);
		});
	});

	describe('actions', () => {
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

			it('dispatch chain', (done) => {
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

			it('dispatch asynchronous', (done) => {
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
			before((done) => {
				setTimeout(done, 500);
			});

			it('dispatch', (done) => {
				const ipcFlux = new IpcFlux();
				ipcFlux.dispatch(1, 'action1').should.eventually.equal('action1 renderer').notify(done);
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

			it('dispatch chain', (done) => {
				const ipcFlux = new IpcFlux();
				ipcFlux.dispatch(1, 'chainDispatch', 'chain dispatch').should.eventually.equal('chain dispatch').notify(done);
			});

			it('dispatch asynchronous', (done) => {
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

				Promise.all([
					ipcFlux.dispatch('local', 'action1').should.eventually.equal('chain dispatch'),
					ipcFlux.dispatch('local', 'action2').should.eventually.equal('action1 renderer')
				]).should.notify(done);
			});
		});
	});

	describe('mutations', () => {
		it('commit', () => {
			const ipcFlux = new IpcFlux({
				mutations: {
					a (state) {
						state.a = 'changed';
					}
				},
				state: {
					a: 1
				}
			});

			ipcFlux.commit('a');

			expect(ipcFlux.state.a).to.equal('changed');
		});

		it('commit (payload)', () => {
			const ipcFlux = new IpcFlux({
				mutations: {
					a (state, n) {
						state.a = n;
					}
				},
				state: {
					a: 1
				}
			});

			ipcFlux.commit('a', 'b');

			expect(ipcFlux.state.a).to.equal('b');
		});
	});
});