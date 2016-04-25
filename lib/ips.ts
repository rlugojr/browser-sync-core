'use strict';

export function resolve (options) {
    return options.mergeDeep({
        externalIps: require('dev-ip')()
    });
}
