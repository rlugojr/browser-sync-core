'use strict';

var Immutable = require('immutable');
var defaultConfig = require('./default-options');
var immDefs = Immutable.fromJS(defaultConfig);

var opts = exports;

/**
 * @param {Object} values
 * @param {Object} [argv]
 * @returns {Map}
 */
opts.merge = function (values) {
    return immDefs.mergeDeep(values);
};