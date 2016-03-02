'use strict';

var bs       = require('../../../');
var Rx       = require('rx');
var assert   = require('chai').assert;
var clientJs = require('../../../dist/client-js');
var plugins  = require('../../../dist/plugins');
var merge    = require('../utils').optmerge;

function process(conf) {
    return [merge(conf)]
        .map(plugins.resolve)
        .map(plugins.namePlugins)
        .map(clientJs.merge)
        .map(clientJs.decorate)
        .map(clientJs.addBuiltIns)[0];
}

describe('client js as options', function () {
    it('can add plugin JS before any user-provided', function () {
        var client1 = 'var name = "shane1"';
        var client2 = 'var name = "shane2"';
        var client3 = 'var name = "shane3"';
        var input = process({
            clientJs: [
                {
                    content: client1
                },
                {
                    content: client2,
                    id: 'my thing'
                }
            ],
            plugins: [
                {
                    module: {
                        hooks: {
                            'option:clientJs': client3
                        }
                    }
                }
            ]
        })
            .get('clientJs')
            .toJS()
            .filter(x => x.via !== 'Browsersync core');

        // Plugin JS goes before any user-provided!
        assert.equal(input[0].content, client3);
        assert.equal(input[1].content, client1);
        assert.equal(input[2].content, client2);
    });
    it('can add all plugin + client provided JS AFTER builtins', function () {
        var client1 = 'var name = "shane1"';
        var client2 = 'var name = "shane2"';
        var client3 = 'var name = "shane3"';
        var ids = process({
            clientJs: [
                {
                    content: client1,
                    id: 'My first inline'
                },
                {
                    content: client2,
                    id: 'My second inline'
                }
            ],
            plugins: [
                {
                    module: {
                        hooks: {
                            'option:clientJs': client3
                        },
                        'plugin:name': 'Client Plugin'
                    }
                }
            ]
        }).get('clientJs');

        var idsJs = ids
            .toJS()
            .reduce((prev, curr) => prev.concat(curr), [])
            .reverse(null, -3)
            .slice(0, 3)
            .reverse();

        assert.equal(idsJs[0].via, 'PLUGIN: Client Plugin');
        assert.equal(idsJs[1].id, 'My first inline');
        assert.equal(idsJs[2].id, 'My second inline');
    });
    it('has expected built-ins', function () {
        const items = process({}).get('clientJs').toJS();
        assert.equal(items[0].via, 'Browsersync core');
        assert.equal(items[0].id, 'bs-no-conflict');
        assert.equal(items[1].id, 'bs-socket-io');
        assert.equal(items[2].id, 'bs-socket-connector');
        assert.equal(items[3].id, 'browser-sync-client');
    });
});
