var assert = require('chai').assert;
var proto  = require('../../../lib/protocol');

function runOne (arg) {
    return proto.validate('Global.reload', arg);
}

describe('Protocol: Global.reload', function () {
    it('can collect reload errors', function () {
        var actual = runOne();
        assert.equal(actual.errors.length, 1);
    });
    it('can collect reload errors', function () {
        var actual = runOne(true);
        assert.equal(actual.errors.length, 0);
    });
    it('can collect reload errors', function () {
        var actual = runOne('true'); // should be a boolean
        assert.equal(actual.errors.length, 1);
    });
});