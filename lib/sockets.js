'use strict';

var socket  = require('socket.io');
var Steward = require('emitter-steward');
var events  = require('events');
var proto   = require('./protocol');
var Rx      = require('rx');
var transform    = require('./transform-options');

/**
 * @param {Server} server
 * @param {Map} options
 * @param {Rx.Observable} optionStream
 */
module.exports.create = function (server, options, optionStream) {

    var clientEvents = options.get('clientEvents');
    var clientOptions = transform.getClientOptions(options);
    var socketConfig = options
        .getIn(['socket', 'socketIoOptions'])
        .toJS();

    var emitter         = new events.EventEmitter();
    var io              = socket(server, socketConfig);
    var clients         = io.of(options.getIn(["socket", "namespace"]));
    var steward         = new Steward(emitter);

    /**
     * Listen for new connections
     */
    var pauser      = new Rx.Subject();

    var connections = Rx.Observable.create(obs => {
        clients.on('connection', obs.onNext.bind(obs));
    })
        .publish()
        .refCount();

    connections
        .pausable(pauser)
        .map(client => {
            clientEvents.forEach(event => {
                client.on(event, (data) => {
                    if (steward.valid(client.id)){
                        client.broadcast.emit(event, data);
                    }
                });
            });
            return client
        })
        .do(client => client.emit('connection', clientOptions))
        .subscribe(() => {}, e => console.log(e.stack));

    /**
     * update local var references when options are changes externally
     * @param options
     */
    function setClosureVars (options) {
        clientEvents  = options.get('clientEvents');
        clientOptions = transform.getClientOptions(options);
    }

    optionStream
        .do(setClosureVars)
        .subscribe(x => console.log('recieved from another'));

    pauser.onNext(true);

    return {
        io: io,
        steward: steward,
        clients: clients,
        connections: connections,
        protocol: {
            send: function (path, arg) {
                var data = proto.validate(path, arg);
                if (data.errors.length) {
                    return data.errors.forEach(function (error) {
                        console.log(`Param ${error.name} missing from ${error.parent}`);
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
        },
        pause: function () {
            pauser.onNext(false);
        },
        resume: function () {
            pauser.onNext(true);
        }
    };
};
