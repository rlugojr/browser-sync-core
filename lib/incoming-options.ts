'use strict';

const Immutable = require('immutable');
const defaultConfig = require('./default-options');
const immDefs = Immutable.fromJS(defaultConfig);

/**
 * @param {Object} values
 * @param {Object} [argv]
 * @returns {Map}
 */
export function merge(values) {
    return immDefs.mergeDeep(values);
}
