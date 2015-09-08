'use strict';

var bs     = require('../../../');
var opts   = require('../../../lib/default-options');
var assert = require('chai').assert;

describe.only('init with files option', function () {
    it('has core files option as string', function (done) {
        bs.create({
            server: './test/fixtures',
            watchOptions: {
                killer: 'whale'
            },
            files: [
                '*.css',
                {
                    match: '*.htmll',
                    fn: function () {},
                    options: {
                        name: 'kittie'
                    }
                }
            ],
            plugins: [
                {
                    module: {},
                    options: {
                        files: [
                            '*.jade',
                            {
                                match: ["*.html", "*.kittie"],
                                options: {
                                    large: 'horse'
                                }
                            }
                        ]
                    }
                },
                {
                    module: {},
                    options: {
                        files: [
                            '*.txt', '*.otherp', {
                                match: 'css/*.css',
                                fn: function() {},
                                options: {
                                    ignored: '*.txt'
                                }
                            }
                        ]
                    }
                }
            ]
        }, function (err, bs) {
            var files = bs.options.get('files').toJS();
            var plugins = Object.keys(bs.options.get('plugins').toJS());
            assert.deepEqual(files.length, 7);
            assert.deepEqual(files[0].namespace, 'core');
            assert.deepEqual(files[1].namespace, 'core');
            assert.deepEqual(files[2].namespace, plugins[0]);
            assert.deepEqual(files[3].namespace, plugins[0]);
            assert.deepEqual(files[4].namespace, plugins[1]);
            assert.deepEqual(files[4].match, '*.txt');
            assert.deepEqual(files[5].match, '*.otherp');
            assert.deepEqual(files[6].match, 'css/*.css');
            assert.deepEqual(files[6].options.ignored, '*.txt');

            assert.equal(files[3].options.ignored.source, opts.watchOptions.ignored.source);
            assert.equal(files[3].options.large, 'horse');

            // setting default options
            assert.equal(files[0].options.ignored.source, opts.watchOptions.ignored.source);
            assert.equal(files[1].options.ignored.source, opts.watchOptions.ignored.source);

            done();
        });
    });
});