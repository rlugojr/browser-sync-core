'use strict';

var assert   = require('chai').assert;
var ss       = require('../../../dist/plugins/serveStatic');
var bs       = require('../../../');
var merge    = require('../utils').optmerge;

function process(conf) {
    return ss.transformOptions(merge(conf));
}

describe('serveStatic as options', function () {
    it('doesn\'t blow up if option missing', function (done) {
        bs.create({}).subscribe(function (bs) {
            bs.cleanup(() => done());
        });
    });
    it('accepts a single string', function (done) {

        bs.create({
            serveStatic: './css'
        }).subscribe(function (bs) {

            var result = bs.options
                .get('serveStatic')
                .toJS();

            assert.equal(result.length, 1);
            assert.equal(result[0].root, './css');

            bs.cleanup(() => done());
        });

    });
    it('accepts array of strings', function () {
        var result = process({
            serveStatic: ['./css', './app']
        })
            .get('serveStatic')
            .toJS();

        assert.equal(result.length, 2);
        assert.equal(result[0].root, './css');
        assert.equal(result[1].root, './app');
    });
    it('accepts a single object', function () {
        var result = process({
            serveStatic: {
                root: './css',
                options: {
                    extensions: ['.html']
                }
            }
        })
            .get('serveStatic')
            .toJS();

        assert.equal(result.length, 1);
        assert.equal(result[0].root, './css');
        assert.equal(result[0].namespace, 'core');
        assert.deepEqual(result[0].options.extensions, ['.html']);
    });
    it('accepts a single object with root as array', function () {
        var result = process({
            serveStatic: {
                root: ['./css', './app'],
                options: {
                    extensions: 'here'
                },
                namespace: 'My SS'
            }
        })
            .get('serveStatic')
            .toJS();

        assert.equal(result.length, 2);
        assert.equal(result[0].root, './css');
        assert.equal(result[0].namespace, 'My SS');
        assert.equal(result[1].root, './app');
        assert.equal(result[1].namespace, 'My SS');
        assert.equal(result[1].options.extensions, 'here');
    });
    it('accepts an array of objects', function () {
        var result = process({
            serveStatic: [
                {
                    root: ['./css', './app'],
                    options: {
                        extensions: 'here'
                    },
                    namespace: 'My SS'
                },
                {
                    root: 'tmp',
                    namespace: 'My Second attempt'
                },
            ]
        })
            .get('serveStatic')
            .toJS();

        assert.equal(result.length, 3);
        assert.equal(result[0].root, './css');
        assert.equal(result[0].namespace, 'My SS');
        assert.equal(result[0].options.extensions, 'here');
        assert.equal(result[1].root, './app');
        assert.equal(result[1].namespace, 'My SS');
        assert.equal(result[1].options.extensions, 'here');
        assert.equal(result[2].root, 'tmp');
        assert.equal(result[2].namespace, 'My Second attempt');
    });
    it('accepts array with both objects + strings', function () {
        var result = process({
            serveStatic: [
                {
                    root: ['./css', './tmp'],
                    options: {
                        name: 'shane'
                    }
                },
                'test/fixtures'
            ]
        })
            .get('serveStatic')
            .toJS();

        assert.equal(result.length, 3);
        assert.equal(result[0].root, './css');
        assert.equal(result[0].options.name, 'shane');
        assert.equal(result[1].root, './tmp');
        assert.equal(result[1].options.name, 'shane');

        assert.equal(result[2].root, 'test/fixtures');
        assert.equal(result[2].namespace, 'core');
        assert.deepEqual(result[2].options, {});
    });
});
