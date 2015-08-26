var request = require('supertest');
var utils = exports;

utils.requestClientJs = function (bs, cb) {
    request(bs.server)
        .get(bs.options.getIn(['scriptPaths', 'versioned']))
        .expect(200)
        .end(function (err, res) {
            if (err) return cb(err);

            cb(null, res.text);
        });
};

utils.getFromPath = function (bs, path, cb) {
    request(bs.server)
        .get(path)
        .set('accept', 'text/html')
        .expect(200)
        .end(function (err, res) {
            if (err) return cb(err);
            cb(null, res.text);
        });
};
