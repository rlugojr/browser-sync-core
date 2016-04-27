const browserSync = require('../../../');
const utils       = require('../utils');
const request     = require('supertest');
const assert      = require('chai').assert;

describe('api: bs.setOption("proxy")', function () {
    it('can set the proxy dynamically at run time', function (done) {
        const app = utils.getApp();
        app.app.use(function (req, res) {
            res.end(utils.resp1(app.url, ''));
        });
        browserSync.create({
            proxy: 'shakyshane.com'
        }).subscribe(function (bs) {
            bs.setOption('proxy', function (proxies) {
                return app.url;
            }).subscribe(function (x) {
                const bsPort = x.get('port');
                assert.equal(x.getIn(['proxy', 0, 'target']), app.url);
                request(x.getIn(['urls', 'local']))
                    .get('/')
                    .set('Accept', 'text/html')
                    .expect(200)
                    .end(function (err, res) {
                        assert.equal(res.text, utils.resp1('//localhost:' + bsPort, x.get('snippet')));
                        app.server.close();
                        bs.cleanup(done);
                    });
            });
        });
    });
});
