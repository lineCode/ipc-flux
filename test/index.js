// es6 all the things
require('babel-register')({
	ignore: /node_modules/
});

// allow chai api's globally
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);

const { expect, should, assert } = chai;

global.expect = expect;
global.should = should();
global.assert = assert;

global.IpcFlux = require('../build/index.js').default;