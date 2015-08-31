var _        = require('lodash');
var Rx       = require('rx');
var online   = Rx.Observable.fromNodeCallback(require("dns").resolve);

module.exports = function getPorts(options) {
    var opt = options.get('online');
    if (_.isUndefined(opt)) {
        return online("www.google.com")
            .flatMap(Rx.Observable.just(true))
            .catch(Rx.Observable.just(false));
    }
    return Rx.Observable.just(opt);
};