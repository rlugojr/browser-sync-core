const browserSync = require('../../../');
const utils       = require('../utils');
const request     = require('supertest');
const assert      = require('chai').assert;

describe('api: bs.setOption("rewriteRules")', function () {
    it('can set rewrite rules at run time', function (done) {
        browserSync.create({
            middleware: [function (req, res) {
                res.end('<!doctype html>\n<html lang="en-US">\n<head>\n    <meta charset="UTF-8">\n    <title></title>\n</head>\n<body>\n    <p>Shane</p>\n</body>\n</html>');
            }]
        }).subscribe(function (bs) {
            bs.setOption('rewriteRules', function (rr) {
                return rr.concat({
                    match: 'Shane',
                    replace: 'kittie'
                });
            }).subscribe(function (x) {
                request(x.getIn(['urls', 'local']))
                    .get('/')
                    .set('Accept', 'text/html')
                    .expect(200)
                    .end(function (err, res) {
                        assert.include(res.text, '<p>kittie</p>');
                        bs.cleanup(done);
                    });
            });
        });
    });
});
