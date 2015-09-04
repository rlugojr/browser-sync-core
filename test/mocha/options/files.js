'use strict';

var bs     = require('../../../');
var assert = require('chai').assert;

describe('init with core files option', function () {
    it('has core files option', function (done) {
        bs.create({
            server: './test/fixtures',
            files: '*.css'
        }, function (err, bs) {
            var files = bs.options.get('files').toJS();
            assert.deepEqual(files.core.globs, ['*.css']);
            done();
        });
    });
    it('has plugin files option', function (done) {
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
                },
                {
                    module: {
                        init: function () {

                        }
                    },
                    options: {
                        files: ["*.html"]
                    }
                }
            ]
        }, function (err, bs) {

            var files = bs.options.get('files').toJS();
            var last  = files[Object.keys(files).slice(-1)];

            assert.deepEqual(files.core.globs, ['*.css']);
            assert.deepEqual(files['Plugin1'].globs, ['*.html', '*.jade']);
            assert.deepEqual(files['Plugin1'].objs[0].match, '*.txt');

            assert.deepEqual(last.globs[0], '*.html');
            assert.deepEqual(last.objs.length, 0);
            done();
        });
    });
});