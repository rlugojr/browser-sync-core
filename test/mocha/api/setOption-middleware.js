const browserSync = require('../../../');
const utils       = require('../utils');
const request     = require('supertest');
const assert      = require('chai').assert;

describe('api: bs.setOption("middleware")', function () {
    it('can set middleware at run time (single fn)', function (done) {
        browserSync.create({}).subscribe(function (bs) {
            bs.setOption('middleware', function (mw) {
                return mw.concat(function (req, res) {
                    res.end('shane');
                });
            }).subscribe(function (x) {
                request(x.getIn(['urls', 'local']))
                    .get('/')
                    .set('Accept', 'text/html')
                    .expect(200)
                    .end(function (err, res) {
                        assert.include(res.text, 'shane');
                        bs.cleanup(done);
                    });
            });
        });
    });
    it('can set middleware at run time (obj with ID)', function (done) {
        browserSync.create({}).subscribe(function (bs) {
            bs.setOption('middleware', function (mw) {
                return mw.concat({id: "myMw", handle: function (req, res) {
                    res.end('shane');
                }});
            }).subscribe(function (x) {
                assert.equal(x.get('middleware').filter(x => x.get('id') === 'myMw').size, 1);
                request(x.getIn(['urls', 'local']))
                    .get('/')
                    .set('Accept', 'text/html')
                    .expect(200)
                    .end(function (err, res) {
                        assert.include(res.text, 'shane');
                        bs.cleanup(done);
                    });
            });
        });
    });
    it('can set middleware at run time (obj with route + ID)', function (done) {
        browserSync.create({}).subscribe(function (bs) {
            bs.setOption('middleware', function (mw) {
                return mw.concat({
                    id: 'myMw',
                    route: '/shane',
                    handle: function (req, res) {
                        res.end('shane');
                    }
                });
            }).subscribe(function (x) {
                assert.equal(x.get('middleware').filter(x => x.get('id') === 'myMw').size, 1);
                request(x.getIn(['urls', 'local']))
                    .get('/shane')
                    .set('Accept', 'text/html')
                    .expect(200)
                    .end(function (err, res) {
                        assert.include(res.text, 'shane');
                        bs.cleanup(done);
                    });
            });
        });
    });
});
