describe('Renderer', () => {
	describe('setup', () => {
		// it('handshake completed', (done) => {
		// 	const ipcFlux = new IpcFlux();

		// 	ipcFlux.handshakePromise.should.eventually.equal(true).notify(done);
		// });

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

			ipcFlux.dispatch('action1').should.eventually.equal('action1').notify(done);
		});
	});

	describe('dispatching', () => {
		it('dispatching locally', (done) => {
			const ipcFlux = new IpcFlux({
				actions: {
					action1: () => {
						return 'action1';
					}
				}
			});

			ipcFlux.dispatch('action1').should.eventually.equal('action1').notify(done);
		});

		it('dispatching locally ({ dispatch })', (done) => {
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

			ipcFlux.dispatch('action1').should.eventually.equal('action2').notify(done);
		});

		it('dispatching locally ({}, payload)', (done) => {
			const ipcFlux = new IpcFlux({
				actions: {
					action1: ({}, payload) => {
						return payload;
					}
				}
			});

			ipcFlux.dispatch('action1', 'hello').should.eventually.equal('hello').notify(done);
		});

		it('dispatching locally ({ dispatch }, payload)', (done) => {
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

			ipcFlux.dispatch('action1', 'hello').should.eventually.equal('hello').notify(done);
		});

		it('dispatching locally (chain)', (done) => {
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

			ipcFlux.dispatch('action1', 'chain dispatch').should.eventually.equal('chain dispatch').notify(done);
		});

		it('dispatching locally simultaneous', (done) => {
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

			ipcFlux.dispatch('action1').should.eventually.equal('action1').notify(done);

			ipcFlux.dispatch('action2').should.eventually.equal('action2');
		});
	});

	describe('external dispatching (renderer --> main)', () => {
		it('dispatching externally', (done) => {
			const ipcFlux = new IpcFlux();
			ipcFlux.dispatchExternal('action1').should.eventually.equal('action1 main').notify(done);
		});

		it('dispatching externally ({ dispatch })', (done) => {
			const ipcFlux = new IpcFlux({
				actions: {
					action1: () => {
						return 'action1 renderer';
					}
				}
			});

			ipcFlux.dispatchExternal('action2').should.eventually.equal('action1 main').notify(done);
		});

		it('dispatching externally ({ dispatchExternal })', (done) => {
			const ipcFlux = new IpcFlux({
				actions: {
					action1: () => {
						return 'action1 renderer';
					}
				}
			});

			ipcFlux.dispatchExternal('action3').should.eventually.equal('action1 renderer').notify(done);
		});

		it('dispatching externally ({ dispatch }, payload)', (done) => {
			const ipcFlux = new IpcFlux({
				actions: {
					action1: () => {
						return 'action1 renderer';
					}
				}
			});

			ipcFlux.dispatchExternal('action4', 'payload').should.eventually.equal('payload').notify(done);
		});

		it('dispatching externally ({ dispatchExternal }, payload)', (done) => {
			const ipcFlux = new IpcFlux({
				actions: {
					action1: ({}, payload) => {
						return payload;
					}
				}
			});

			ipcFlux.dispatchExternal('action5', 'payload').should.eventually.equal('payload').notify(done);
		});

		it('dispatching externally ({ dispatch, dispatchExternal }, payload)', (done) => {
			const ipcFlux = new IpcFlux({
				actions: {
					action1: ({}, payload) => {
						return payload;
					}
				}
			});

			ipcFlux.dispatchExternal('action6', 'payload').should.eventually.equal('payloadpayload').notify(done);
		});

		it('dispatching externally (chain)', (done) => {
			const ipcFlux = new IpcFlux({
				actions: {
					action1: ({}, payload) => {
						return payload;
					}
				}
			});

			ipcFlux.dispatchExternal('chainDispatch').should.eventually.equal('chain dispatch').notify(done);
		});

		it('dispatching externally simultaneous', (done) => {
			const ipcFlux = new IpcFlux({
				actions: {
					action1: ({ dispatchExternal }) => {
						return new Promise((resolve) => {
							setTimeout(() => {
								resolve(dispatchExternal('chainDispatch'));
							}, 100);
						});
					},
					action2: ({ dispatchExternal }) => {
						return dispatchExternal('action1');
					}
				}
			});

			ipcFlux.dispatch('action1').should.eventually.equal('chain dispatch').notify(done);

			ipcFlux.dispatch('action2').should.eventually.equal('action1 main');
		});
	});
});