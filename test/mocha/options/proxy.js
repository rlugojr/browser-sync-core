const proxy = require('../../../lib/plugins/proxy');
const assert = require('chai').assert;
const utils = require('../utils');

describe('Transforming proxy option', function () {
    it('accepts a target only proxy option as array', function () {
        const opts = utils.optmerge({
            proxy: [
                {
                    target: 'http://bbc.co.uk'
                }
            ]
        });
        const trans = proxy.transformOptions(opts).get('proxy').toJS();
        assert.equal(trans[0].target, 'http://bbc.co.uk');
        assert.equal(trans[0].url.href, 'http://bbc.co.uk/');
    });
    it('accepts multiple proxies', function () {
        const opts = utils.optmerge({
            proxy: [
                {
                    target: 'http://bbc.co.uk'
                },
                {
                    route: '/api',
                    target: 'http://some.backend.dev'
                }
            ]
        });
        const trans = proxy.transformOptions(opts).get('proxy').toJS();
        assert.equal(trans[0].route, '');
        assert.equal(trans[0].target, 'http://bbc.co.uk');
        assert.equal(trans[1].route, '/api');
        assert.equal(trans[1].target, 'http://some.backend.dev');
    });
    it('accepts proxy as object', function () {
        const opts = utils.optmerge({
            proxy: {
                route: '/api',
                target: 'http://some.backend.dev'
            }
        });
        const trans = proxy.transformOptions(opts).get('proxy').toJS();
        assert.equal(trans[0].route, '/api');
        assert.equal(trans[0].target, 'http://some.backend.dev');
    });
    it('accepts single proxy as string', function () {
        const opts = utils.optmerge({
            proxy: 'http://some.backend.dev'
        });
        const trans = proxy.transformOptions(opts).get('proxy').toJS();
        assert.equal(trans[0].route, '');
        assert.equal(trans[0].target, 'http://some.backend.dev');
    });
    it('maintains default map for options', function () {
        const opts = utils.optmerge({
            proxy: {
                target: 'http://some.backend.dev',
                options: {
                    xfwd: true
                }
            }
        });
        const setOpts = proxy.transformOptions(opts).getIn(['proxy', 0, 'options']).toJS();
        assert.equal(setOpts.changeOrigin, true);
    });
    it('maintains default map for options and overrides', function () {
        const opts = utils.optmerge({
            proxy: [{
                target: 'http://some.backend.dev',
                options: {
                    xfwd: true,
                    changeOrigin: false
                }
            },{
                route:  '/api',
                target: 'http://some.other.backend.dev'
            }]
        });
        const setOpts = proxy.transformOptions(opts).getIn(['proxy']).toJS();
        assert.equal(setOpts[0].options.changeOrigin, false);
        assert.equal(setOpts[1].options.changeOrigin, true);
    });
    it('has cookie options', function () {
        const opts = utils.optmerge({
            proxy: [{
                target: 'http://some.backend.dev',
            }]
        });
        const setOpts = proxy.transformOptions(opts).getIn(['proxy']).toJS();
        assert.equal(setOpts[0].cookies.stripDomain, true);
    });
    it('overrides cookie cookie options', function () {
        const opts = utils.optmerge({
            proxy: [{
                target: 'http://some.backend.dev',
                cookies: {
                    stripDomain: false
                }
            }]
        });
        const setOpts = proxy.transformOptions(opts).getIn(['proxy']).toJS();
        assert.equal(setOpts[0].cookies.stripDomain, false);
    });
    it('ignores when option not given', function () {
        const opts  = utils.optmerge({});
        const trans = proxy.transformOptions(opts).get('proxy');
        assert.isUndefined(trans);
    });
});