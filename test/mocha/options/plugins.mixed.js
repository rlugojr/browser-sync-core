'use strict';

var bs       = require('../../../');
var sinon    = require('sinon');
var assert   = require('chai').assert;

describe('async & sync mixed plugin resolution in correct order', function () {
    it('accepts both async and sync, calling them in correct order', function (done) {
        var calls = [];

        const fn1 = () => calls.push('1');
        const fn3 = () => calls.push('3');

        bs.create({
            plugins: [
                {
                    module: {init: fn1}
                },
                {
                    module: {initAsync: (bs, opts, cb) => {
                        setTimeout(() => {
                            calls.push('2');
                            cb.done()
                        }, 200);
                    }}
                },
                {
                    module: {init: fn3}
                },
                {
                    module: {initAsync: (bs, opts, cb) => {
                        setTimeout(() => {
                            calls.push('4');
                            cb.done()
                        }, 200);
                    }}
                },
            ]
        }, function (err, bs) {

            var plugins = bs.options
                .get('plugins')
                .toJS();

            assert.equal(plugins.length, 4);
            assert.equal(calls[0], '1');
            assert.equal(calls[1], '2');
            assert.equal(calls[2], '3');
            assert.equal(calls[3], '4');

            bs.cleanup();
            done();
        });
    });
});
