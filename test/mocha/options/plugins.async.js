'use strict';

var bs       = require('../../../');
var sinon    = require('sinon');
var assert   = require('chai').assert;

describe('async plugin resolution', function () {
    it('accepts a plugin that takes time to initialise', function (done) {
        var spy = sinon.spy();
        var calls = [];
        bs.create({
            plugins: [
                {
                    module: {
                        initAsync: function (bs, opts, done) {
                            setTimeout(function () {
                                calls.push('plugin 1');
                                done();
                            }, 500);
                        },
                        'plugin:name': 'My Awesome Plugin'
                    },
                    options: {
                        name: 'shane'
                    }
                },
                {
                    module: {
                        initAsync: function (bs, opts, done) {
                            setTimeout(function () {
                                calls.push('plugin 2');
                                done();
                            }, 0);
                        }
                    }
                }
            ]
        }, function (err, bs) {

            var plugin = bs.options.getIn(['plugins', 'My Awesome Plugin']).toJS();
            //console.log(bs.options.getIn(['plugins']).toJS());

            assert.equal(plugin.options.name, 'shane');
            assert.equal(plugin.via, 'inline');
            assert.equal(calls[0], 'plugin 1');
            assert.equal(calls[1], 'plugin 2');

            bs.cleanup();
            done();
        });
    });
});