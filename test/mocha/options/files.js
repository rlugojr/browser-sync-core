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
                        files: ['*.txt', '*.otherp', {match: 'css/*.css', fn: function(){}, options: {ignore: '*.txt'}}]
                    }
                }
            ]
        }, function (err, bs) {
            var files = bs.options.get('files').toJS();
            var plugins = Object.keys(bs.options.get('plugins').toJS());
            assert.deepEqual(files.length, 6);
            assert.deepEqual(files[0].namespace, 'core');
            assert.deepEqual(files[1].namespace, 'core');
            assert.deepEqual(files[2].namespace, plugins[0]);
            assert.deepEqual(files[3].namespace, plugins[1]);
            assert.deepEqual(files[4].namespace, plugins[1]);
            assert.deepEqual(files[4].match, '*.otherp');
            assert.deepEqual(files[5].match, 'css/*.css');
            assert.deepEqual(files[5].options.ignore, '*.txt');

            done();
        });
    });
});