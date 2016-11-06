const assert  = require("chai").assert;
const request = require("supertest");

describe("e2e options test (cors)", function () {
    it.only("Adds cors middleware", function (done) {
        const browserSync = require('../../../');
        var config = {
            serveStatic: ['test/fixtures'],
            cors: true
        };
        browserSync.create(config).subscribe(function (bs) {
            request(bs.server)
                .get("/index.html")
                .expect(200)
                .end(function (err, res) {
                    assert.equal(res.headers["access-control-allow-origin"], "*");
                    assert.equal(res.headers["access-control-allow-methods"], "GET, POST, OPTIONS, PUT, PATCH, DELETE");
                    assert.equal(res.headers["access-control-allow-headers"], "X-Requested-With,content-type");
                    assert.equal(res.headers["access-control-allow-credentials"], "true");
                    bs.cleanup(done);
                });
        });
    });
});
