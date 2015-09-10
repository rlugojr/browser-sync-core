'use strict';

var bs       = require('../../../');
var sinon    = require('sinon');
var assert   = require('chai').assert;

describe('plugins as options', function () {
    it('accepts a plugin as inline obj', function (done) {
        var spy = sinon.spy();
        bs.create({
            plugins: [
                {
                    module: {
                        init: function (bs, opts, done) {
                            spy();
                            done();
                        },
                        'plugin:name': 'My Awesome Plugin'
                    },
                    options: {
                        name: 'shane'
                    }
                }
            ]
        }, function (err, bs) {
            var plugin = bs.options.getIn(['plugins', 'My Awesome Plugin']).toJS();
            assert.equal(plugin.options.name, 'shane');
            assert.equal(plugin.via, 'inline');

            bs.cleanup();
            done();
        });
    });
    it('init with plugin option as string', function (done) {
        bs.create({
            plugins: [
                './test/fixtures/plugin1.js'
            ]
        }, function (err, bs) {
            var plugin = bs.options.getIn(['plugins', 'Plugin1']).toJS();
            assert.equal(plugin.module['plugin:name'], 'Plugin1');
            assert.ok(plugin.via.match(/test\/fixtures\/plugin1\.js$/));

            bs.cleanup();
            done();
        });
    });
    it('init with plugin option as string + options', function (done) {
        bs.create({
            plugins: [
                {
                    module: './test/fixtures/plugin1.js',
                    options: {
                        name: 'shane'
                    }
                }
            ]
        }, function (err, bs) {
            var plugin = bs.options.getIn(['plugins', 'Plugin1']).toJS();
            assert.equal(plugin.options.name, 'shane');
            assert.ok(plugin.via.match(/test\/fixtures\/plugin1\.js$/));

            bs.cleanup();
            done();
        });
    });
    it('accepts no plugins ', function (done) {
        bs.create({}, function (err, bs) {
            assert.equal(Object.keys(bs.options.get('plugins').toJS()).length, 0);

            bs.cleanup();
            done();
        });
    });
});