const utils   = require('../utils');

describe('Can proxy', function () {
    it.only('rewrites links with simple markup', function (done) {
        utils.proxye2e('resp1', done);
    });
});
