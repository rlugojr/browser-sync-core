'use strict';

var bs       = require('../../../');
var sinon    = require('sinon');
var assert   = require('chai').assert;
var plugins  = require('../../../lib/plugins');
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
        }).toJS();

        assert.equal(out.plugins.length, 1);
        assert.equal(out.plugins[0].name, 'bs-plugin-0');
    });
    it('init with plugin option as string', function () {
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
        bs.create({}, function (err, bs) {
            assert.equal(Object.keys(bs.options.get('plugins').toJS()).length, 0);
            bs.cleanup();
            done();
        });
    });
});