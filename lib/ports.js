'use strict';

const Rx       = require('rx');
const just     = Rx.Observable.just;
const zip      = Rx.Observable.zip;
const debug    = require('debug')('bs:ports');
const findPort = Rx.Observable.fromNodeCallback(require('portscanner').findAPortNotInUse);

function getPort (start, strict, name) {

    debug(`> trying  ${start} for ${name}`);

    return findPort(start, undefined, {host: 'localhost', timeout: 1000})

        .flatMap(function (x) {

            debug(`+ success ${x} for ${name}`);

            if (strict && start !== x) {
                return Rx.Observable.throw('Strict Mode: Port ' + start + ' not available');
            }

            return just(x);
        });
}

module.exports.fn = function getPorts(options) {

    const strict = options.get('strict');
    const port1  = options.get('port');

    return getPort(port1, strict, 'core')

        .flatMap(function (defaultPort) {

            const def = just(defaultPort);

            if (!options.getIn(['proxy', 'ws'])) {

                debug(`no WS, using single port/server at ${defaultPort}`);

                return def.map(function (x) {
                    return {
                        port: x
                    };
                });
            }

            return zip(def, getPort(options.getIn(['socket', 'port']) || defaultPort + 1, strict, 'socket'), function (first, second) {
                return {
                    port: first,
                    socket: {
                        port: second
                    }
                };
            });
        });
};