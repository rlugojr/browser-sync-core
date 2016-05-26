const utils = require('../utils');
const browserSync = require('../../../');
const request = require('supertest');
const assert = require('chai').assert;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

describe('Can proxy HTTPS', function () {
    it('Allows paths in the initial proxy option', function (done) {

        const app = utils.getSecureApp();
        var called = 0;
        app.app.use(function (req, res) {
            called ++;
            res.end(utils.resp1(app.url, ''));
        });

        browserSync.create({
            proxy: app.url
        }).subscribe(function (bs) {
            const bsPort = bs.options.get('port');
            assert.equal(bs.options.getIn(['proxy', 0, 'options', 'target']), app.url);
            assert.equal(bs.options.getIn(['urls', 'local']), 'https://localhost:' + bs.options.get('port'));
            request(bs.options.getIn(['urls', 'local']))
                .get('/')
                .set('Accept', 'text/html')
                .expect(200, function (err, res) {
                    assert.equal(res.text, utils.resp1('//localhost:' + bsPort, bs.options.get('snippet')));
                    assert.deepEqual(called, 1);
                    app.server.close();
                    bs.cleanup(done);
                });
        });
    });
});
