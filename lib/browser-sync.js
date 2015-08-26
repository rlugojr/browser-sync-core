var opts = require('./incoming-options');
var tran = require('./transform-options');
var bs   = exports;

bs.create = function (userOptions, cb) {
    var options = tran.update(opts.merge(userOptions));
    var obj = {
        options: options
    };
    cb(null, obj);
};

module.exports = bs;