const utils      = exports;
const opts       = require('../../lib/incoming-options');
const transform  = require('../../lib/transform-options');
const socket     = require('socket.io-client');

utils.optmerge = function (input) {
    return opts.merge(input);
};

utils.getClient = function (bs) {
    const opts = bs.options.toJS();
    const connectionUrl = opts.urls.local + opts.socket.namespace;
    return socket(connectionUrl, {
        path: opts.socket.socketIoOptions.path,
        forceNew: true
    });
};