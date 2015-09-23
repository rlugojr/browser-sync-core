'use strict';

var bs       = require('../../../');
var sinon    = require('sinon');
var assert   = require('chai').assert;
var ss       = require('../../../lib/serve-static');
var merge    = require('../utils').optmerge;

function process(conf) {
    return ss.decorate(ss.merge(merge(conf)));
}

describe('serveStatic as options', function () {
    it('accepts simple strings', function () {
        var result = process({
            serveStatic: [
                {
                    root: ['./css', './tmp'],
                    options: {
                        name: 'shane'
                    }
                },
                './test/fixtures'
            ]
        })
            .get('serveStatic')
            .toJS();

        assert.equal(result.length, 3);
        assert.equal(result[0].root, './css');
        assert.equal(result[0].options.name, 'shane');
        assert.equal(result[1].root, './tmp');
        assert.equal(result[1].options.name, 'shane');
        assert.equal(result[2].root, './test/fixtures');
    });
    it('accepts old server options as priority with options', function () {
        var ss = process({
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
            }
        }).get('serveStatic').toJS();
        assert.equal(ss.length, 4);
        assert.equal(ss[0].root, '.tmp');
        assert.equal(ss[0].options.extensions[0], 'js');
        assert.equal(ss[1].root, 'lib');
        assert.equal(ss[1].options.extensions[0], 'js');
        assert.equal(ss[2].root, 'shne');

        assert.equal(ss[3].root, './app');
        assert.equal(ss[3].options.index, 'index.html');
        assert.equal(ss[3].options.extensions[0], 'html');
    });
    it('accepts multi roots with shared options', function () {
        var ss = process({
            serveStatic: [
                {
                    root: ['./app']
                }
            ]
        }).get('serveStatic').toJS();
        assert.equal(ss.length, 1);
        assert.equal(ss[0].root, './app');
    });
});