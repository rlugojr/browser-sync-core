const browserSync = require('../../../');
const utils       = require('../utils');
const conf        = require('../../../dist/config');
const assert      = require('chai').assert;

describe('Process cleanups', function () {
    it('allows sync cleanup methods', function (done) {
        var calls = 0;
        const config = {
            plugins: [
                {
                    module: {
                        initAsync: function (bs, opts, obs) {
                            obs.done();
                            return function () {
                                calls += 1;
                            }
                        }
                    }
                }
            ]
        };

        browserSync.create(config).subscribe(function (bs) {
            bs.cleanup(function () {
            	assert.deepEqual(calls, 1);
                done();
            });
        });
    });
    it('allows async cleanup methods', function (done) {
        var calls = 0;
        const config = {
            plugins: [
                {
                    module: {
                        initAsync: function (bs, opts, obs) {
                            obs.done();
                            return function (done) {
                                setTimeout(function () {
                                    calls += 1;
                                    done();
                                }, 100);
                            }
                        }
                    }
                }
            ]
        };

        browserSync.create(config).subscribe(function (bs) {
            bs.cleanup(function () {
            	assert.deepEqual(calls, 1);
                done();
            });
        });
    });
});
