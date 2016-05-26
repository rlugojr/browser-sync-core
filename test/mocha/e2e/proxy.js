const utils = require('../utils');

describe('Can proxy', function () {
    it('rewrites links with simple markup', function (done) {
        utils.proxye2e('resp1', done);
    });
    it('Allows paths in the initial proxy option', function (done) {
        const browserSync = require('../../../');
        const utils = require('../utils');
        const request = require('supertest');
        const assert = require('chai').assert;

        const app = utils.getApp();
        app.app.use(function (req, res) {
            res.end(utils.resp1(app.url, ''));
        });

        browserSync.create({
            proxy: app.url + '/somepath'
        }).subscribe(function (bs) {
            const bsPort = bs.options.get('port');
            assert.equal(bs.options.getIn(['proxy', 0, 'options', 'target']), app.url);
            request(bs.options.getIn(['urls', 'local']))
                .get('/')
                .set('Accept', 'text/html')
                .expect(200)
                .end(function (err, res) {
                    assert.equal(res.text, utils.resp1('//localhost:' + bsPort, bs.options.get('snippet')));
                    app.server.close();
                    bs.cleanup(done);
                });
        });
    });
});
