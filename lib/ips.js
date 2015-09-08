'use strict';

module.exports.resolve = function (options) {
    return options.mergeDeep({
        externalIps: require('dev-ip')()
    });
};