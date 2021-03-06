describe('Renderer', () => {
	afterEach(() => {
		const ipcFlux = new IpcFlux();
		ipcFlux.debug.kill();
	});

	describe('setup', () => {
		it('instance created on `new`', () => {
			const ipcFlux = new IpcFlux();
			expect(ipcFlux instanceof IpcFlux).to.be.true;
		});

		it('identifies running process', () => {
			const ipcFlux = new IpcFlux();
			expect(ipcFlux.debug.process).to.equal('renderer');
		});

		it('action registered via `registerAction`', (done) => {
			const ipcFlux = new IpcFlux();

			ipcFlux.registerAction('action1', () => {
				return 'action1';
			});

			ipcFlux.dispatch('local', 'action1').should.eventually.equal('action1').notify(done);
		});

		it('setting state throws error', () => {
			const ipcFlux = () => {
				new IpcFlux({
					state: {
						key: 'value'
					}
				});
			};

			expect(ipcFlux).to.throw(Error);
		});
	});

	describe('state', () => {
		it('state retrieved from main', () => {
			const ipcFlux = new IpcFlux();
			setTimeout(() => {
				expect(JSON.stringify(ipcFlux.state)).to.equal(JSON.stringify({a: 1, b: 2, c: 3}));
			}, 150);
		});

		it('changes in main are pushed to renderer', () => {
			const ipcFlux = new IpcFlux();

			ipcFlux.dispatch('main', 'action7');

			setTimeout(() => {
				expect(JSON.stringify(ipcFlux.state)).to.equal(JSON.stringify({a: 4, b: 2, c: 3}));
			}, 100);
		});

		it('changes in renderer are pushed to main', (done) => {
			const ipcFlux = new IpcFlux({
				mutations: {
					a: (state) => {
						state.a = 3;
					}
				}
			});

			ipcFlux.commit('a');

			setTimeout(() => {
				ipcFlux.dispatch('main', 'action8', 3).should.eventually.equal(true).notify(done);
			}, 100);
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

		describe('renderer --> main', () => {
			it('dispatch', (done) => {
				const ipcFlux = new IpcFlux();
				ipcFlux.dispatch('main', 'action1').should.eventually.equal('action1 main').notify(done);
			});

			it('dispatch ({ dispatch })', (done) => {
				const ipcFlux = new IpcFlux({
					actions: {
						action1: () => {
							return 'action1 renderer';
						}
					}
				});

				ipcFlux.dispatch('main', 'action2').should.eventually.equal('action1 main').notify(done);
			});

			it('dispatch ({ dispatch })', (done) => {
				const ipcFlux = new IpcFlux({
					actions: {
						action1: () => {
							return 'action1 renderer';
						}
					}
				});

				ipcFlux.dispatch('main', 'action3').should.eventually.equal('action1 renderer').notify(done);
			});

			it('dispatch ({ dispatch }, payload)', (done) => {
				const ipcFlux = new IpcFlux({
					actions: {
						action1: () => {
							return 'action1 renderer';
						}
					}
				});

				ipcFlux.dispatch('main', 'action4', 'payload').should.eventually.equal('payload').notify(done);
			});

			it('dispatch ({ dispatch }, payload)', (done) => {
				const ipcFlux = new IpcFlux({
					actions: {
						action1: ({}, payload) => {
							return payload;
						}
					}
				});

				ipcFlux.dispatch('main', 'action5', 'payload').should.eventually.equal('payload').notify(done);
			});

			it('dispatch ({ dispatch }, payload)', (done) => {
				const ipcFlux = new IpcFlux({
					actions: {
						action1: ({}, payload) => {
							return payload;
						}
					}
				});

				ipcFlux.dispatch('main', 'action6', 'payload').should.eventually.equal('payloadpayload').notify(done);
			});

			it('dispatch chain', (done) => {
				const ipcFlux = new IpcFlux({
					actions: {
						action1: ({}, payload) => {
							return payload;
						}
					}
				});

				ipcFlux.dispatch('main', 'chainDispatch').should.eventually.equal('chain dispatch').notify(done);
			});

			it('dispatch asynchronous', (done) => {
				const ipcFlux = new IpcFlux({
					actions: {
						action1: ({ dispatch }) => {
							return new Promise((resolve) => {
								setTimeout(() => {
									resolve(dispatch('main', 'chainDispatch'));
								}, 100);
							});
						},
						action2: ({ dispatch }) => {
							return dispatch('main', 'action1');
						}
					}
				});

				ipcFlux.dispatch('local', 'action1').should.eventually.equal('chain dispatch').notify(done);

				ipcFlux.dispatch('local', 'action2').should.eventually.equal('action1 main');
			});
		});

		describe('renderer --> renderer', () => {
			it('dispatch', (done) => {
				const ipcFlux = new IpcFlux();

				ipcFlux.dispatch(1, 'action1').should.eventually.equal('action1 renderer').notify(done);
			});

			it('dispatch ({ dispatch })', (done) => {
				const ipcFlux = new IpcFlux();

				ipcFlux.dispatch(1, 'action2').should.eventually.equal('action1 renderer').notify(done);
			});

			it('dispatch ({ dispatch })', (done) => {
				const ipcFlux = new IpcFlux({
					actions: {
						action1: () => {
							return 'action1 renderer';
						}
					}
				});

				ipcFlux.dispatch(1, 'action3').should.eventually.equal('action1 renderer').notify(done);
			});

			it('dispatch ({ dispatch }, payload)', (done) => {
				const ipcFlux = new IpcFlux({
					actions: {
						action1: ({}, payload) => {
							return payload;
						}
					}
				});

				ipcFlux.dispatch(1, 'action4', 'payload').should.eventually.equal('payload').notify(done);
			});

			it('dispatch ({ dispatch }, payload)', (done) => {
				const ipcFlux = new IpcFlux({
					actions: {
						action1: ({}, payload) => {
							return payload;
						}
					}
				});

				ipcFlux.dispatch(1, 'action5', 'payload').should.eventually.equal('payload').notify(done);
			});

			it('dispatch ({ dispatch }, payload)', (done) => {
				const ipcFlux = new IpcFlux({
					actions: {
						action1: ({}, payload) => {
							return payload;
						}
					}
				});

				ipcFlux.dispatch(1, 'action6', 'payload').should.eventually.equal('payloadpayload').notify(done);
			});

			it('dispatch chain', (done) => {
				const ipcFlux = new IpcFlux({
					actions: {
						action1: ({}, payload) => {
							return payload;
						}
					}
				});

				ipcFlux.dispatch(1, 'chainDispatch').should.eventually.equal('chain dispatch').notify(done);
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

				ipcFlux.dispatch('local', 'action1').should.eventually.equal('chain dispatch').notify(done);

				ipcFlux.dispatch('local', 'action2').should.eventually.equal('action1 renderer');
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
				}
			});

			ipcFlux.commit('a', 'b');

			expect(ipcFlux.state.a).to.equal('b');
		});
	});
});