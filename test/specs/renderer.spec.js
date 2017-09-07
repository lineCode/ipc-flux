describe('Renderer', () => {
	describe('setup', () => {
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

		// describe('external', () => {
		// 	it('dispatch', (done) => {
		// 		const ipcFlux = new IpcFlux();
		// 		ipcFlux.dispatch('main', 'action1').should.eventually.equal('action1 main').notify(done);
		// 	});

		// 	it('dispatchExternal ({ dispatch })', (done) => {
		// 		const ipcFlux = new IpcFlux({
		// 			actions: {
		// 				action1: () => {
		// 					return 'action1 renderer';
		// 				}
		// 			}
		// 		});

		// 		ipcFlux.dispatchExternal('action2').should.eventually.equal('action1 main').notify(done);
		// 	});

		// 	it('dispatchExternal ({ dispatchExternal })', (done) => {
		// 		const ipcFlux = new IpcFlux({
		// 			actions: {
		// 				action1: () => {
		// 					return 'action1 renderer';
		// 				}
		// 			}
		// 		});

		// 		ipcFlux.dispatchExternal('action3').should.eventually.equal('action1 renderer').notify(done);
		// 	});

		// 	it('dispatchExternal ({ dispatch }, payload)', (done) => {
		// 		const ipcFlux = new IpcFlux({
		// 			actions: {
		// 				action1: () => {
		// 					return 'action1 renderer';
		// 				}
		// 			}
		// 		});

		// 		ipcFlux.dispatchExternal('action4', 'payload').should.eventually.equal('payload').notify(done);
		// 	});

		// 	it('dispatchExternal ({ dispatchExternal }, payload)', (done) => {
		// 		const ipcFlux = new IpcFlux({
		// 			actions: {
		// 				action1: ({}, payload) => {
		// 					return payload;
		// 				}
		// 			}
		// 		});

		// 		ipcFlux.dispatchExternal('action5', 'payload').should.eventually.equal('payload').notify(done);
		// 	});

		// 	it('dispatchExternal ({ dispatch, dispatchExternal }, payload)', (done) => {
		// 		const ipcFlux = new IpcFlux({
		// 			actions: {
		// 				action1: ({}, payload) => {
		// 					return payload;
		// 				}
		// 			}
		// 		});

		// 		ipcFlux.dispatchExternal('action6', 'payload').should.eventually.equal('payloadpayload').notify(done);
		// 	});

		// 	it('dispatchExternal (chain)', (done) => {
		// 		const ipcFlux = new IpcFlux({
		// 			actions: {
		// 				action1: ({}, payload) => {
		// 					return payload;
		// 				}
		// 			}
		// 		});

		// 		ipcFlux.dispatchExternal('chainDispatch').should.eventually.equal('chain dispatch').notify(done);
		// 	});

		// 	it('dispatchExternal simultaneous', (done) => {
		// 		const ipcFlux = new IpcFlux({
		// 			actions: {
		// 				action1: ({ dispatchExternal }) => {
		// 					return new Promise((resolve) => {
		// 						setTimeout(() => {
		// 							resolve(dispatchExternal('chainDispatch'));
		// 						}, 100);
		// 					});
		// 				},
		// 				action2: ({ dispatchExternal }) => {
		// 					return dispatchExternal('action1');
		// 				}
		// 			}
		// 		});

		// 		ipcFlux.dispatch('action1').should.eventually.equal('chain dispatch').notify(done);

		// 		ipcFlux.dispatch('action2').should.eventually.equal('action1 main');
		// 	});
		// });
	});
});