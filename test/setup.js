// es6 all the things
require('babel-register')({
	ignore: /node_modules/
});

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);

const { expect, should, assert } = chai;

global.expect = expect;
global.should = should();
global.assert = assert;

global.IpcFlux = require('../build/index.js').default;