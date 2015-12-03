'use strict';

const Immutable = require('immutable');
const defaultConfig = require('./default-options');
const immDefs = Immutable.fromJS(defaultConfig);

const opts = exports;

/**
 * @param {Object} values
 * @param {Object} [argv]
 * @returns {Map}
 */
opts.merge = function (values) {
    return immDefs.mergeDeep(values);
};