'use strict';

var assert   = require('chai').assert;

var bs         = require('../../../');
var stubOnline = require('../../utils').stubOnline;

describe('init with online option', function () {
    it('can be offline', function () {
        bs.create({online: false}, function (err, bs) {
            assert.equal(bs.options.get('online'), false);
            bs.cleanup();
        });
    });
    it('can be online', function () {
        bs.create({online: true}, function (err, bs) {
            assert.equal(bs.options.get('online'), true);
            bs.cleanup();
        });
    });
    it('can resolve online', function (done) {
        var stub = stubOnline(false);
        bs.create({}, function (err, bs) {
            assert.equal(bs.options.get('online'), false);
            stub.restore();
            bs.cleanup();
            done();
        });
    });
    it('can resolve offline', function (done) {
        var stub = stubOnline(true);
        bs.create({}, function (err, bs) {
            assert.equal(bs.options.get('online'), true);
            stub.restore();

            bs.cleanup();
            done();
        });
    });
});
