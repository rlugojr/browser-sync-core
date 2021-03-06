'use strict';

var bs       = require('../../../');
var assert   = require('chai').assert;

describe('urls option', function () {
    it('init with urls option', function (done) {
        bs.create({
            serveStatic: './test/fixtures'
        }).subscribe(function (bs) {
            var urls = bs.options.get('urls').toJS();
            var port = bs.options.get('port');
            assert.equal(urls.local,    'http://localhost:' + port);
            if (bs.options.get('online')) {
                assert.ok(urls.external.match(new RegExp(port + '$')));
            }
            bs.cleanup(function () {
                done();
            });
        });
    })
});
