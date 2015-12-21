'use strict';

const Rx       = require('rx');
const just     = Rx.Observable.just;
const zip      = Rx.Observable.zip;
const findPort = Rx.Observable.fromNodeCallback(require('portscanner').findAPortNotInUse);

function getPort (start, strict) {
    return findPort(start, undefined, {host: 'localhost', timeout: 1000})
        .flatMap(function (x) {
            if (strict && start !== x) {
                return Rx.Observable.throw('Strict Mode: Port ' + start + ' not available');
            }
            return just(x);
        });
}

module.exports.fn = function getPorts(options) {
    const strict = options.get('strict');
    return getPort(options.get('port'), strict)
        .flatMap(function (defaultPort) {
            const def = just(defaultPort);
            if (!options.getIn(['proxy', 'ws'])) {
                return def.map(function (x) {
                    return {
                        port: x
                    };
                });
            }
            return zip(def, getPort(options.getIn(['socket', 'port']) || defaultPort + 1, strict), function (first, second) {
                return {
                    port: first,
                    socket: {
                        port: second
                    }
                };
            });
        });
};