'use strict';

var bs       = require('../../../');
var sinon    = require('sinon');
var assert   = require('chai').assert;

describe('async plugin resolution', function () {
    it('accepts a plugin that takes time to initialise', function (done) {
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

            var plugin = bs.options
                .get('plugins')
                .filter(x => x.get('name') === 'My Awesome Plugin')
                .get(0)
                .toJS();

            assert.equal(plugin.options.name, 'shane');
            assert.equal(plugin.via, 'inline');
            assert.equal(calls[0], 'plugin 1');
            assert.equal(calls[1], 'plugin 2');

            bs.cleanup();
            done();
        });
    });
});