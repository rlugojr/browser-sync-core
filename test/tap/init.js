'use strict';

var bs      = require('../../');
var Rx      = require('rx');
//var request = require('supertest');
var test    = require('../tap').test;
var utils   = require('../utils');
var sinon   = require('sinon');
var isOnline   = require('../../lib/online');

test('init with online option', function (t) {
    t.plan(4);
    bs.create({online: false}, function (err, bs) {
        t.equal(bs.options.get('online'), false);
    });
    bs.create({online: true}, function (err, bs) {
        t.equal(bs.options.get('online'), true);
    });
    var stub = sinon.stub(isOnline, 'online').returns(Rx.Observable.just(false));
    bs.create({}, function (err, bs) {
        t.equal(bs.options.get('online'), false);
    });
    stub.returns(Rx.Observable.just(true));
    bs.create({}, function (err, bs) {
        t.equal(bs.options.get('online'), true);
    });
    isOnline.online.restore();
});
