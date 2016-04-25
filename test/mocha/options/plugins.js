'use strict';

var bs       = require('../../../');
var sinon    = require('sinon');
var assert   = require('chai').assert;
var plugins  = require('../../../dist/plugins');
var merge    = require('../utils').optmerge;

function process(conf) {
    return [merge(conf)]
        .map(plugins.resolve)
        .map(plugins.namePlugins)
        [0];
}

describe('plugins as options', function () {
    it('names an inline plugin with plugin:name missing', function () {
        var out = process({
            plugins: [
                {
                    module: {
                        hooks: {
                            'option:clientJs': 'console.log("say hello to my little friend")'
                        }
                    }
                }
            ]
        }).get('plugins');

        assert.equal(out.size, 1);
        assert.ok(out.get(0).name.match(/bs-plugin-\d{1,2}/));
    });
    it('init with plugin option as fn only', function () {
        const fn = function (bs) {
            console.log(bs.options.get('urls'));
        };
        var plugin = process({
                plugins: [fn]
            })
            .getIn(['plugins', 0])
            .toJS();

        assert.isString(plugin.name);
        assert.equal(plugin.module.init, fn);
        assert.isTrue(plugin.name.length > 0); // random ID generated for this
    });
    it('multiple simple plugins as fns', function () {
        const fn = (bs) => console.log(bs.options.get('urls'));
        const fn2 = (bs) => console.log(bs.options.get('urls2'));
        var plugin = process({
                plugins: [fn, fn2]
            })
            .getIn(['plugins'])
            .toJS();

        assert.isString(plugin[0].name);
        assert.equal(plugin[0].module.init, fn);
        assert.isTrue(plugin[0].name.length > 0); // random ID generated for this

        assert.isString(plugin[1].name);
        assert.equal(plugin[1].module.init, fn2);
        assert.isTrue(plugin[1].name.length > 0); // random ID generated for this
        assert.isTrue(plugin[1].name !== plugin[0].name); // random ID generated for this
    });
    it('init with plugin option as string only', function () {
        var plugin = process({
                plugins: './test/fixtures/plugin2.js'
            })
            .getIn(['plugins', 0])
            .toJS();

        assert.isString(plugin.name);
        assert.isTrue(plugin.name.length > 0); // random ID generated for this
        assert.ok(plugin.via.match(/test\/fixtures\/plugin2\.js$/));
    });
    it('init with plugin option as string in array', function () {
        var plugin = process({
            plugins: [
                './test/fixtures/plugin1.js'
            ]})
            .get('plugins')
            .filter(x => x.get('name') === 'Plugin1')
            .get(0)
            .toJS();

        assert.equal(plugin.name, 'Plugin1');
        assert.equal(plugin.module['plugin:name'], 'Plugin1');
        assert.ok(plugin.via.match(/test\/fixtures\/plugin1\.js$/));
    });
    it('init with plugin option as string + options', function () {
        var plugin = process({
            plugins: [
                {
                    module: './test/fixtures/plugin1.js',
                    options: {
                        name: 'shane'
                    }
                }
            ]})
            .get('plugins')
            .filter(x => x.get('name') === 'Plugin1')
            .get(0)
            .toJS();

        assert.equal(plugin.options.name, 'shane');
        assert.ok(plugin.via.match(/test\/fixtures\/plugin1\.js$/));
    });
    it('accepts no plugins ', function (done) {
        bs.create({}).subscribe(function (bs) {
            assert.equal(Object.keys(bs.options.get('plugins').toJS()).length, 0);
            bs.cleanup();
            done();
        });
    });
});
