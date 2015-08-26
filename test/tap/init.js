'use strict';

var bs      = require('../../');
var request = require('supertest');
var test    = require('../tap').test;
var utils   = require('../utils');

test('E2E server test with only a callback', function (t) {
    t.type(bs.create, 'function');
});
