var assert = require('chai').assert;
var proto  = require('../../../lib/protocol');

describe('Protocol: Client.register', function () {
    it('can collect missing errors', function () {
        var actual = proto.validate('Client.register');
        assert.equal(actual.errors.length, 1);
        assert.equal(actual.errors[0].errorType, 'missing');
    });
    it('can collect type errors on top level', function () {
        var actual = proto.validate('Client.register', null);
        assert.equal(actual.errors.length, 1);
        assert.equal(actual.errors[0].errorType, 'type');
        assert.equal(actual.errors[0].name, 'client');
    });
    it('can collect missing errors on nested', function () {
        var actual = proto.validate('Client.register', {});
        assert.equal(actual.errors.length, 1);
        assert.equal(actual.errors[0].errorType, 'missing');
        assert.equal(actual.errors[0].name, 'id');
        assert.equal(actual.errors[0].path, 'client.id');
    });
    it('can collect type errors on nested', function () {
        var actual = proto.validate('Client.register', {
            id: 12345
        });
        assert.equal(actual.errors.length, 1);
        assert.equal(actual.errors[0].errorType, 'type');
        assert.equal(actual.errors[0].name, 'id');
        assert.equal(actual.errors[0].path, 'client.id');
    });
    it('can invalid method errors', function () {
        var actual = proto.validate('Client.noop', {
            id: 12345
        });
        assert.equal(actual.errors.length, 1);
        assert.equal(actual.errors[0].errorType, 'command-missing');
        assert.equal(actual.errors[0].name, 'noop');
    });
    it('can invalid domain errors', function () {
        var actual = proto.validate('Clientz.register', {
            id: 12345
        });
        assert.equal(actual.errors[0].errorType, 'domain-missing');
        assert.equal(actual.errors[0].name, 'Clientz');
    });
});