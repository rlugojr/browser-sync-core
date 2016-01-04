const browserSync = require('../../../');
const utils       = require('../utils');
const conf        = require('../../../lib/config');
const assert      = require('chai').assert;

describe('Process cleanups', function () {
    it('allows sync cleanup methods', function (done) {
        var calls = 0;
        const config = {
            plugins: [
                {
                    module: {
                        initAsync: (bs, opts, obs) => {
                            obs.done();
                            return () => {
                                calls += 1;
                            }
                        }
                    }
                }
            ]
        };

        browserSync.create(config, function (err, bs) {
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
                        initAsync: (bs, opts, obs) => {
                            obs.done();
                            return (done) => {
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

        browserSync.create(config, function (err, bs) {
            bs.cleanup(function () {
            	assert.deepEqual(calls, 1);
                done();
            });
        });
    });
});
