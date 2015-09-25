var assert = require('chai').assert;
var proto  = require('../../../lib/protocol');

function runOne (arg) {
    return proto.validate('Options.set', arg);
}

describe('Protocol: Options.set', function () {
    it('can collect missing errors', function () {
        var actual = runOne();
        assert.equal(actual.errors.length, 1);
    });
    it('can collect incorrect type errors', function () {
        var actual = runOne('string');
        assert.equal(actual.errors.length, 1);
    });
    it('can validate an object', function () {
        var actual = runOne({});
        assert.equal(actual.errors.length, 0);
        assert.ok(actual.payload.args.options);
    });
    it('can validate an object with properties', function () {
        var actual = runOne({
            ghostMode: {
                clicks: true,
                forms: {
                    scroll: true
                }
            }
        });
        assert.equal(actual.errors.length, 0);
        assert.ok(actual.payload.args.options);
        assert.isTrue(actual.payload.args.options.ghostMode.clicks);
        assert.isTrue(actual.payload.args.options.ghostMode.forms.scroll);
    });
});