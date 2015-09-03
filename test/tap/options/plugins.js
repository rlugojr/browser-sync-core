'use strict';

var bs       = require('../../../');
var test     = require('../../tap').test;
var sinon    = require('sinon');

test('init with plugin option as object', function (t) {
    t.plan(2);
    var spy = sinon.spy();
    bs.create({
        plugins: [
            {
                module: {
                    init: function (bs, opts, done) {
                        spy();
                        done();
                    },
                    "plugin:name": "My Awesome Plugin"
                },
                options: {
                    name: "shane"
                }
            }
        ]
    }, function (err, bs) {
        var plugin = bs.options.getIn(['plugins', "My Awesome Plugin"]).toJS();
        t.equal(plugin.options.name, 'shane');
        t.equal(plugin.via, 'inline');
    });
});

test('init with plugin option as string', function (t) {
    bs.create({
        plugins: [
            './test/fixtures/plugin1.js'
        ]
    }, function (err, bs) {
        var plugin = bs.options.getIn(['plugins', "Plugin1"]).toJS();
        t.equal(plugin.module['plugin:name'], 'Plugin1');
        t.ok(plugin.via.match(/test\/fixtures\/plugin1\.js$/));
        t.end();
    });
});

test('init with plugin option as string + options', function (t) {
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
        var plugin = bs.options.getIn(['plugins', "Plugin1"]).toJS();
        t.equal(plugin.options.name, 'shane');
        t.ok(plugin.via.match(/test\/fixtures\/plugin1\.js$/));
        t.end();
    });
});