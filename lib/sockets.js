'use strict';

const socket    = require('socket.io');
const proto     = require('./protocol');
const server    = require('./server');
const Rx        = require('rx');
const transform = require('./transform-options');

/**
 * @param {Server} server
 * @param {Map} options
 */
module.exports.create = function (server, options) {

    const socketConfig = options
        .getIn(['socket', 'socketIoOptions'])
        .toJS();

    const io      = getSocketServer(options, server, socketConfig);
    const clients = io.of(options.getIn(['socket', 'namespace']));

    return {
        io: io,
        clients: clients,
        protocol: {
            send: function (path, arg) {
                const data = proto.validate(path, arg);
                if (data.errors.length) {
                    return data.errors.forEach(function (error) {
                        console.log(`Error type: ${error.errorType}, property: ${error.name}`);
                    });
                }
                clients.emit(data.payload.path, data.payload.args);
            },
            sendOptionToClient: function (client, id, options) {
                const data = proto.validate('Options.set', id, options.toJS());
                if (data.errors.length) {
                    return data.errors.forEach(function (error) {
                        console.log(`Error type: ${error.errorType}, property: ${error.name}`);
                    });
                }
                client.emit(data.payload.path, data.payload.args);
            }
        }
    };
};

function  getSocketServer (options, mainServer, config) {

    const proxy = options.get('proxy');
    const hasWs = (proxy && proxy.filter(x => x.get('ws')).size > 0);

    const socketServer = hasWs
        ? server.getServer(null, options)
        : mainServer;

    if (hasWs) {
        socketServer.server.listen(options.getIn(['socket', 'port']));
        return socket(socketServer.server, config);
    }

    return socket(socketServer, config);
}
