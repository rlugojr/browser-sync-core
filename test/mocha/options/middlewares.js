'use strict';

var bs       = require('../../../');
var sinon    = require('sinon');
var assert   = require('chai').assert;

describe('middlewares as options', function () {
    it('accepts top-level middleware', function (done) {
        var fn1 = function fn1() {};
        var fn2 = function fn2() {};
        var fn3 = function fn3() {};
        var fn4 = function fn4() {};
        var fn5 = function fn5() {};
        var fn6 = function fn6() {};
        bs.create({
            middleware: [fn1, fn2],
            plugins: [
                {
                    module: {
                        hooks: {
                            'server:middleware': [fn3, fn4]
                        }
                    }
                },
                {
                    module: {
                        hooks: {
                            'server:middleware': [fn5, fn6]
                        }
                    }
                }
            ]
        }, function (err, bs) {
            var middleware = bs.options.get('middleware').toJS();
            var plugins    = bs.options.get('plugins').toJS();
            assert.equal(middleware[0], fn1);
            assert.equal(middleware[1], fn2);
            assert.equal(middleware[2], fn3);
            assert.equal(middleware[3], fn4);
            assert.equal(middleware[4], fn5);
            assert.equal(middleware[5], fn6);
            assert.equal(middleware.length, 6);
            done();
        });
    });
});