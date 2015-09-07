'use strict';

var bs     = require('../../../');
var assert = require('chai').assert;

describe('init with files option', function () {
    it('has core files option as string', function (done) {
        bs.create({
            server: './test/fixtures',
            files: [
                '*.css',
                {
                    match: '*.htmll',
                    fn: function () {}
                }
            ],
            plugins: [
                {
                    module: {},
                    options: {
                        files: ['*.jade']
                    }
                },
                {
                    module: {},
                    options: {
                        files: ['*.txt', '*.otherp']
                    }
                }
            ]
        }, function (err, bs) {
            var files = bs.options.get('files').toJS();
            var plugins = Object.keys(bs.options.get('plugins').toJS());
            assert.deepEqual(files.length, 5);
            assert.deepEqual(files[0].namespace, 'core');
            assert.deepEqual(files[1].namespace, 'core');
            assert.deepEqual(files[2].namespace, plugins[0]);
            assert.deepEqual(files[3].namespace, plugins[1]);
            assert.deepEqual(files[4].namespace, plugins[1]);
            done();
        });
    });
});