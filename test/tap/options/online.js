'use strict';

var Rx       = require('rx');
var sinon    = require('sinon');

var bs       = require('../../../');
var test     = require('../../tap').test;
var utils    = require('../../utils');
var isOnline = require('../../../lib/online');

test('init with online option', function (t) {
    t.plan(4);
    bs.create({online: false}, function (err, bs) {
        t.equal(bs.options.get('online'), false);
    });
    bs.create({online: true}, function (err, bs) {
        t.equal(bs.options.get('online'), true);
    });
    var stub = sinon.stub(isOnline, 'fn').returns(Rx.Observable.just(false));
    bs.create({}, function (err, bs) {
        t.equal(bs.options.get('online'), false);
    });
    stub.returns(Rx.Observable.just(true));
    bs.create({}, function (err, bs) {
        t.equal(bs.options.get('online'), true);
    });
    isOnline.fn.restore();
});
