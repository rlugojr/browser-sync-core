'use strict';

var Rx = require('rx');
var Immutable = require('immutable');
var transform    = require('./transform-options');
var fromEvent    = Rx.Observable.fromEvent;

function track(bsSocket, options$) {

    const connections$ = Rx.Observable.fromEvent(bsSocket.clients, 'connection');
    const events       = require('events');
    const emitter      = new events.EventEmitter();
    const Steward      = require('emitter-steward');
    const steward      = new Steward(emitter);
    const clients$     = new Rx.BehaviorSubject(Immutable.OrderedMap());

    /**
     * Available Clients
     */
    Rx.Observable
        .interval(6000)
        .map(x => bsSocket.clients.sockets.map(x => x.id))
        .withLatestFrom(clients$, (sockets, clients) => {
            return clients.filter(x => {
                return sockets.indexOf(x.get('socketId')) > -1;
            });
        })
        .subscribe(clients$);

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
        .subscribe(function () {});

    /**
     * With every connection
     */
    connections$
        .flatMap(x => fromEvent(x, 'Client.register'))
        .withLatestFrom(clients$, (connection, clients) => {
            return clients.updateIn([connection.client.id], x => createClient(connection));
        })
        .subscribe(clients$);

    return {
        clients$: clients$.distinctUntilChanged(x => x.map(x => x.get('id'))).share()
    };

}

function createClient (incoming) {
    return Immutable.Map({
        id: incoming.client.id,
        heartbeat: new Date().getTime()
    }).merge(incoming.data);
}


module.exports.track = track;
