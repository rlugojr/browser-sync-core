'use strict';

var Rx = require('rx');
var Immutable = require('immutable');
var transform    = require('./transform-options');
var fromEvent    = Rx.Observable.fromEvent;

function track(connections$, options$) {

    const events       = require('events');
    const emitter      = new events.EventEmitter();
    const Steward      = require('emitter-steward');
    const steward      = new Steward(emitter);
    const clients$     = new Rx.BehaviorSubject(Immutable.OrderedMap());
    const maxHeartbeat = 5000;

    /**
     * Listen for incoming connections that occur
     * every time the browser page is reloaded or
     * when a client reconnects
     * Add client sharing event such as scroll click etc
     */
    connections$
        .withLatestFrom(options$, (client, opts) => {
            return {client: client, options: opts};
        })
        .do(x => {
            x.options.get('clientEvents').forEach(event => {
                x.client.on(event, (data) => {
                    if (steward.valid(x.client.id)) {
                        x.client.broadcast.emit(event, data);
                    }
                });
            });
        })
        .do(x => {
            x.client.emit('connection', transform.getClientOptions(x.options));
        })
        .subscribe(function (x) {
            //console.log('CONNECTION', x.client.id);
        });

    /**
     * With every connection
     */
    connections$
        .flatMap(x => fromEvent(x, 'Client.register'))
        .withLatestFrom(clients$, (connection, clients) => {
            let current = connection.client;

            if (clients.hasIn([current.id])) {
                return clients.updateIn([current.id], x => updateHeartbeat(x));
            }
            return clients.set(current.id, createClient(current));
        })
        .subscribe(clients$);

    Rx.Observable.prototype.withLatestFromOnly = function (arg) {
        return this.map(x => arg.getValue());
    };

    /**
     * Client Filter
     */
    Rx.Observable
        .interval(1000)
        .withLatestFromOnly(clients$)
        .map(x => x.filter(client => getTime() - client.get('heartbeat') < maxHeartbeat))
        .subscribe(clients$);




    clients$
        .distinctUntilChanged(x => x.map(x => x.get('id')))
        .subscribe(function (clients) {
            console.log('----~----~----~----', clients.size);
            console.log('UPDATED BRO', clients.toJS());
        });


    ///**
    // * Create a map of unique browser sessions
    // */
    //    .do(client => {
    //
    //        var ua = client.handshake.headers['user-agent'];
    //
    //        client.on('Client.heartbeat', function (incoming) {
    //        });
    //
    //        client.on('Client.register', function (incoming) {
    //
    //            var options       = optSub.getValue();
    //            var id            = incoming.client.id;
    //            var clientPath    = ['clientOptions', id];
    //            var defaultPath   = ['clientOptions', 'default'];
    //            var currentClient = options.getIn(clientPath);
    //            var newClient;
    //
    //            if (!currentClient) {
    //                //console.log('NO CURRENT, register', id);
    //                newClient = options
    //                    .getIn(defaultPath)
    //                    .merge({
    //                        id: id,
    //                        ua: ua,
    //                        browser: utils.getUaString(ua),
    //                        heartbeat: new Date().getTime()
    //                    });
    //                options = options.setIn(clientPath, newClient);
    //                optSub.onNext(options);
    //            } else {
    //                // console.log('HAS CURRENT, no register', id);
    //                // Send heartbeat
    //            }
    //
    //            bsSocket.protocol.sendOptionToClient(client, id, currentClient || newClient);
    //
    //            /**
    //             * Announce we have updated clients
    //             */
    //
    //            clients.onNext(options.get('clientOptions'));
    //        });
    //    })
    //    .do(client => client.emit('connection', clientOptions))
    //    .subscribe(() => {}, e => console.log(e.stack));
}

function createClient (incoming) {
    return Immutable.Map({
        id: incoming.id,
        heartbeat: new Date().getTime()
    });
}

function getTime () {
    return new Date().getTime();
}

function updateHeartbeat(client) {
    return client.set('heartbeat', getTime());
}

module.exports.track = track;