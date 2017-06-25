// es6 all the things
require('babel-register')({
	ignore: /node_modules/
});

// allow chai api's globally
const { expect, should, assert } = require('chai');
global.expect = expect;
global.should = should;
global.assert = assert;

global.IpcFlux = require('../build/index.js').default;