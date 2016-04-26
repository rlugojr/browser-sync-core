'use strict';

var bs       = require('../../../');
var sinon    = require('sinon');
var assert   = require('chai').assert;

describe('sync plugin resolution', function () {
    it('accepts a plugin that has a sync init method', function (done) {
        var calls = [];
        var fn1 = function() { calls.push(1) };
        var fn2 = function() { calls.push(2) };
        bs.create({
            plugins: [
                {module: {init: fn1}},
                {module: {init: fn2}}
            ]
        }).subscribe(function (bs) {

            var plugins = bs.options
                .get('plugins')
                .filter(function(x) {return !x.get('internal') });

            assert.equal(plugins.size, 2);
            assert.equal(calls[0], '1');
            assert.equal(calls[1], '2');
            bs.cleanup();
            done();
        });
    });
});
