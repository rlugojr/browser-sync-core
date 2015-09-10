'use strict';

var bs       = require('../../../');
var sinon    = require('sinon');
var assert   = require('chai').assert;

describe('client js as options', function () {
    it('can accept client js objects in options', function (done) {
        var client1 = 'var name = "shane1"';
        var client2 = 'var name = "shane2"';
        bs.create({
            clientJs: [
                {
                    content: client1
                },
                {
                    content: client2,
                    id: 'my thing',
                    active: true
                }
            ],
            plugins: [
                {
                    module: {
                        hooks: {
                            'client:js': client2
                        }
                    },

                }
            ]
        }, function (err, bs) {
            var client = bs.options.get('clientJs').toJS();
            assert.equal(client[0].content, client1);
            assert.equal(client[1].content, client2);
            assert.equal(client[1].id, 'my thing');
            assert.equal(client[1].active, true);
            assert.equal(client[2].content, client2);

            bs.cleanup();
            done();
        });
    });
});