'use strict';

var socket  = require('socket.io');
var Steward = require('emitter-steward');
var events  = require('events');
var Rx      = require('rx');

/**
 * @param {http.Server} server
 * @param clientEvents
 * @param {BrowserSync} bs
 */
module.exports.create = function (server, options) {

    //var emitter      = bs.events;

    var socketConfig = options
        .get('socket')
        .toJS();

    var clientEvents = options.get('clientEvents');

    var emitter = new events.EventEmitter();

    //if (bs.options.get("mode") === "proxy" && bs.options.getIn(["proxy", "ws"])) {
    //    server = utils.getServer(null, bs.options).server;
    //    server.listen(bs.options.getIn(["socket", "port"]));
    //    bs.registerCleanupTask(function () {
    //        server.close();
    //    });
    //}

    var socketIoConfig  = socketConfig.socketIoOptions;
    socketIoConfig.path = socketConfig.path;
    var io = socket(server, socketIoConfig);

    io.sockets = io.of(socketConfig.namespace);
    io.set('heartbeat interval', socketConfig.clients.heartbeatTimeout);

    var steward  = new Steward(emitter);

    /**
     * Listen for new connections
     */
    var pauser      = new Rx.Subject();
    var connections = Rx.Observable.create(obs => {
        io.sockets.on('connection', obs.onNext.bind(obs));
    }).publish()
        .refCount()
        .pausable(pauser);

    connections
        .subscribe(client => {
            clientEvents.forEach(event => {
                client.on(event, (data) => {
                    if (steward.valid(client.id)){
                        client.broadcast.emit(event, data);
                    }
                });
            });
            client.emit('connection', options.toJS()); //todo - trim the amount of options sent to clients
        },
        e => console.log(e.stack));

    pauser.onNext(true);

    return {
        io: io,
        steward: steward,
        pause: function () {
            pauser.onNext(false);
        },
        resume: function () {
            pauser.onNext(true);
        }
    };
};
