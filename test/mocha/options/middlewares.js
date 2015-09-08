'use strict';

var bs       = require('../../../');
var sinon    = require('sinon');
var assert   = require('chai').assert;

describe('middlewares as options', function () {
    it('accepts top-level middleware', function (done) {
        var spy = sinon.spy();
        var fn = function () {};
        bs.create({
            middleware: [fn]
        }, function (err, bs) {
            var middleware = bs.options.get('middleware').toJS();
            assert.equal(middleware[0], fn);
            done();
        });
    });
});