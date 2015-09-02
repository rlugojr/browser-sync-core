'use strict';

var bs       = require('../../../');
var test     = require('../../tap').test;
var sinon    = require('sinon');

test('init with urls option', function (t) {
    bs.create({
        server: './test/fixtures'
    }, function (err, bs) {
        var urls = bs.options.get('urls').toJS();
        var port = bs.options.get('port');
        t.equal(urls.local,    'http://localhost:' + port);
        if (bs.options.get('online')) {
            t.ok(urls.external.match(new RegExp(port + '$')));
        }
        t.end();
        //t.equal(plugins.length, 1);
        //t.equal(plugins[0].options.name, 'shane');
        //t.equal(plugins[0].via, 'inline');
    });
});