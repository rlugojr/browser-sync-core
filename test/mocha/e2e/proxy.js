const utils   = require('../utils');

describe('Can proxy', function () {
    it('rewrites links with simple markup', function (done) {
        utils.proxye2e('resp1', done);
    });
});

