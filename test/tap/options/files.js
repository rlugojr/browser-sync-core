'use strict';

var bs       = require('../../../');
var test     = require('../../tap').test;
var sinon    = require('sinon');

test('init with core files option', function (t) {
    bs.create({
        server: './test/fixtures',
        files: '*.css'
    }, function (err, bs) {
        var files = bs.options.get('files').toJS();
        t.deepEqual(files.core.globs, ["*.css"]);
        t.end();
    });
});

test('init with plugins files option', function (t) {
    bs.create({
        server: './test/fixtures',
        files: '*.css',
        plugins: [
            {
                module: './test/fixtures/plugin1.js',
                options: {
                    files: [
                        '*.html',
                        '*.jade',
                        {
                            match: '*.txt',
                            fn: function (event, file) {

                            }
                        }
                    ]
                }
            }
        ]
    }, function (err, bs) {
        var files = bs.options.get('files').toJS();
        t.deepEqual(files.core.globs, ["*.css"]);
        t.deepEqual(files['Plugin1'].globs, ['*.html', '*.jade']);
        t.deepEqual(files['Plugin1'].objs[0].match, '*.txt');
        t.end();
    });
});