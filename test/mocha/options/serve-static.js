'use strict';

var bs       = require('../../../');
var sinon    = require('sinon');
var assert   = require('chai').assert;

describe('serveStatic as options', function () {
    it('accepts simple strings', function (done) {
        bs.create({
            server: ['./test', './other'],
            serveStatic: [
                {
                    root: ['./css', './tmp'],
                    options: {
                        name: 'shane'
                    }
                },
                './test/fixtures'
            ]
        }, function (err, bs) {
            var ss = bs.options.get('serveStatic').toJS();

            assert.equal(ss.length, 5);
            assert.equal(ss[0].root, './test');
            assert.equal(ss[1].root, './other');

            assert.equal(ss[2].root, './css');
            assert.equal(ss[2].options.name, 'shane');

            assert.equal(ss[3].root, './tmp');
            assert.equal(ss[3].options.name, 'shane');

            assert.equal(ss[3].root, './tmp');

            bs.cleanup();
            done();
        });
    });
    it('accepts old server options as priority with options', function (done) {
        bs.create({
            serveStatic: [
                'shne',
                {
                    root: './app',
                    options: {
                        extensions: ['html']
                    }
                }
            ],
            server: {
                baseDir: ['.tmp', 'lib'],
                serveStaticOptions: {
                    extensions: ['js']
                }
            },
        }, function (err, bs) {
            var ss = bs.options.get('serveStatic').toJS();
            assert.equal(ss.length, 4);
            assert.equal(ss[0].root, '.tmp');
            assert.equal(ss[0].options.extensions[0], 'js');
            assert.equal(ss[1].root, 'lib');
            assert.equal(ss[1].options.extensions[0], 'js');
            assert.equal(ss[2].root, 'shne');

            assert.equal(ss[3].root, './app');
            assert.equal(ss[3].options.index, 'index.html');
            assert.equal(ss[3].options.extensions[0], 'html');
            bs.cleanup();
            done();
        });
    });
});