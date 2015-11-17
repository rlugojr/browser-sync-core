'use strict';

var socket  = require('socket.io');
var proto   = require('./protocol');
var Rx      = require('rx');
var transform    = require('./transform-options');

/**
 * @param {Server} server
 * @param {Map} options
 */
module.exports.create = function (server, options) {

    var socketConfig = options
        .getIn(['socket', 'socketIoOptions'])
        .toJS();

    var io      = socket(server, socketConfig);
    var clients = io.of(options.getIn(['socket', 'namespace']));

    return {
        io: io,
        clients: clients,
        protocol: {
            send: function (path, arg) {
                var data = proto.validate(path, arg);
                if (data.errors.length) {
                    return data.errors.forEach(function (error) {
                        console.log(`Error type: ${error.errorType}, property: ${error.name}`);
                    });
                }
                clients.emit(data.payload.path, data.payload.args);
            },
            sendOptionToClient: function (client, id, options) {
                var data = proto.validate('Options.set', id, options.toJS());
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
