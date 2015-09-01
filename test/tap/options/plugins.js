'use strict';

var bs       = require('../../../');
var test     = require('../../tap').test;
var sinon    = require('sinon');

test('init with plugin option as object', function (t) {
    t.plan(3);
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
        var plugins = bs.options.get('plugins').toJS();
        t.equal(plugins.length, 1);
        t.equal(plugins[0].options.name, 'shane');
        t.equal(plugins[0].via, 'inline');
    });
});

test('init with plugin option as string', function (t) {
    t.plan(3);
    bs.create({
        plugins: [
            './test/fixtures/plugin1.js'
        ]
    }, function (err, bs) {
        var plugins = bs.options.get('plugins').toJS();
        t.equal(plugins.length, 1);
        t.equal(plugins[0].module['plugin:name'], 'Plugin1');
        t.ok(plugins[0].via.match(/test\/fixtures\/plugin1\.js$/));
    });
});

test('init with plugin option as string + options', function (t) {
    t.plan(3);
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
        var plugins = bs.options.get('plugins').toJS();
        t.equal(plugins.length, 1);
        t.equal(plugins[0].options.name, 'shane');
        t.ok(plugins[0].via.match(/test\/fixtures\/plugin1\.js$/));
    });
});