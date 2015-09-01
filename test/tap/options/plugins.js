'use strict';

var Rx       = require('rx');
var sinon    = require('sinon');

var bs       = require('../../../');
var test     = require('../../tap').test;
var utils    = require('../../utils');
var sinon    = require('sinon');
var isOnline = require('../../../lib/online');

test('init with plugin option', function (t) {
    t.plan(1);
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
        t.equal(bs.options.get('plugins').size, 1);
        //t.equal(spy.calledOnce, true);
    });
});
