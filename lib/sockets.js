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
module.exports.create = function (bs, server, options) {

    const socketConfig = options
        .getIn(['socket', 'socketIoOptions'])
        .toJS();

    const socketServer = getSocketServer(options, server, socketConfig);
    const io           = socket(socketServer.server, socketConfig);
    const clients      = io.of(options.getIn(['socket', 'namespace']));

    return {
        socketServer,
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

    if (hasWs) {
        const socketServer = server.getServer(null, options);
        socketServer.server.listen(options.getIn(['socket', 'port']));
        return socketServer;
    }

    return mainServer;
}
