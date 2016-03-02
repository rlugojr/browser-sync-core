const utils     = exports;
const opts      = require('../../dist/incoming-options');
const transform = require('../../dist/transform-options');
const socket    = require('socket.io-client');

var uniq        = 0;

utils.optmerge = function (input) {
    return opts.merge(input);
};

utils.getClientSocket = function (bs) {
    const opts = bs.options.toJS();
    const connectionUrl = opts.urls.local + opts.socket.namespace;
    return socket(connectionUrl, {
        path: opts.socket.socketIoOptions.path,
        forceNew: true
    });
};

utils.getClient = function (id, data) {
    return {
        client: {
            id: id || String(uniq += 1)
        },
        data: data || {}
    };
};
