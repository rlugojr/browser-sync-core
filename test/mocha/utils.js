var utils = exports;
var opts       = require('../../lib/incoming-options');
var transform  = require('../../lib/transform-options');

utils.optmerge = function (input) {
    return transform.update(opts.merge(input));
};