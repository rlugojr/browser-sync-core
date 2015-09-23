'use strict';

var bs       = require('../../../');
var Rx       = require('rx');
var assert   = require('chai').assert;
var clientJs = require('../../../lib/client-js');
var plugins  = require('../../../lib/plugins');
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
});