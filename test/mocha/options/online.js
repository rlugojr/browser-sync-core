'use strict';

var assert   = require('chai').assert;

var bs         = require('../../../');
var stubOnline = require('../../utils').stubOnline;

describe('init with online option', function () {
    it('can be offline', function (done) {
        bs.create({online: false}).subscribe(function (bs) {
            assert.equal(bs.options.get('online'), false);
            bs.cleanup();
            done();
        });
    });
    it('can be online', function (done) {
        bs.create({online: true}).subscribe(function (bs) {
            assert.equal(bs.options.get('online'), true);
            bs.cleanup();
            done();
        });
    });
    it('can resolve online', function (done) {
        var stub = stubOnline(false);
        bs.create({}).subscribe(function (bs) {
            assert.equal(bs.options.get('online'), false);
            stub.restore();
            bs.cleanup();
            done();
        });
    });
    it('can resolve offline', function (done) {
        var stub = stubOnline(true);
        bs.create({}).subscribe(function (bs) {
            assert.equal(bs.options.get('online'), true);
            stub.restore();

            bs.cleanup();
            done();
        });
    });
});
