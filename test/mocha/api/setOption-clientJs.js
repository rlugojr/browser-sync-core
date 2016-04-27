const browserSync = require('../../../');
const utils       = require('../utils');
const request     = require('supertest');
const assert      = require('chai').assert;

describe('api: bs.setOption("clientJs")', function () {
    it('can set client JS at run time (string)', function (done) {
        browserSync.create({}).subscribe(function (bs) {
            bs.setOption('clientJs', function (cjs) {
                return cjs.concat('console.log("shane")');
            }).subscribe(function (x) {
                request(x.getIn(['urls', 'client-local']))
                    .get('/')
                    .set('Accept', 'text/html')
                    .expect(200)
                    .end(function (err, res) {
                        assert.include(res.text, 'console.log("shane")');
                        bs.cleanup(done);
                    });
            });
        });
    });
    it('can set client JS at run time (obj)', function (done) {
        browserSync.create({}).subscribe(function (bs) {
            bs.setOption('clientJs', function (cjs) {
                return cjs.concat({id: 'kittie', content: 'console.log("shane")'});
            }).subscribe(function (x) {
                request(x.getIn(['urls', 'client-local']))
                    .get('/')
                    .set('Accept', 'text/html')
                    .expect(200)
                    .end(function (err, res) {
                        assert.include(res.text, 'ID:  kittie');
                        assert.include(res.text, 'console.log("shane")');
                        bs.cleanup(done);
                    });
            });
        });
    });
});
