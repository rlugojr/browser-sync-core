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