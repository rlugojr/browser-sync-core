var Rx       = require('rx');
var findPort = Rx.Observable.fromNodeCallback(require('portscanner').findAPortNotInUse);

function getPort (start, strict) {
    return findPort(start, undefined, {host: 'localhost', timeout: 1000})
        .flatMap(function (x) {
            if (strict && start !== x) {
                return Rx.Observable.throw('Strict Mode: Port ' + start + ' not available');
            }
            return Rx.Observable.just(x);
        })
}

module.exports = function getPorts(options) {
    var strict = options.get('strict');
    return getPort(options.get('port'), strict)
        .flatMap(function (defaultPort) {
            var def = Rx.Observable.just(defaultPort);
            if (!options.getIn(['proxy', 'ws'])) {
                return def.map(function (x) {
                    return {port: x};
                });
            }
            return Rx.Observable.zip(def, getPort(options.getIn(['socket', 'port']) || defaultPort + 1, strict), function (first, second) {
                return {port: first, socket: {port: second}};
            });
        });
};