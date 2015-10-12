'use strict';

var bs         = require('../../../');
var sinon      = require('sinon');
var assert     = require('chai').assert;
var plugins    = require('../../../lib/plugins');
var middleware = require('../../../lib/middleware');
var merge      = require('../utils').optmerge;

function process(conf) {
    return [merge(conf)]
        .map(plugins.resolve)
        .map(plugins.namePlugins)
        .map(middleware.merge)
        .map(middleware.decorate)
        [0];
}

describe('middlewares as options', function () {
    it('accepts top-level middleware', function () {
        var fn1 = function fn1() {};
        var fn2 = function fn2() {};
        var fn3 = function fn3() {};
        var fn4 = function fn4() {};
        var fn5 = function fn5() {};
        var fn6 = function fn6() {};
        var actual = process({
            middleware: [fn1, fn2],
            plugins: [
                {
                    module: {
                        hooks: {
                            'server:middleware': [fn3, {route: '/shane', handle: fn4, id: 'some-name'}]
                        }
                    }
                },
                {
                    module: {
                        hooks: {
                            'server:middleware': [fn5, fn6]
                        }
                    }
                }
            ]
        })

        var middleware = actual.get('middleware').toJS();
        var plugins    = actual.get('plugins').toJS();

        assert.equal(middleware[0].handle, fn3);
        assert.equal(middleware[1].handle, fn4);
        assert.equal(middleware[1].id, 'some-name');
        assert.equal(middleware[1].route, '/shane');

        assert.equal(middleware[2].handle, fn5);
        assert.equal(middleware[3].handle, fn6);
        assert.equal(middleware[4].handle, fn1);
        assert.equal(middleware[5].handle, fn2);
        assert.equal(middleware.length, 6);
    });
});