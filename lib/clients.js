'use strict';

var Rx = require('rx');
var Immutable = require('immutable');
var transform    = require('./transform-options');
var fromEvent    = Rx.Observable.fromEvent;

function track(connections$, options$, bsSocket) {

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
    //
    ///**
    // * With every connection
    // */
    connections$
        .flatMap(x => fromEvent(x, 'Client.register'))
        .withLatestFrom(clients$, (connection, clients) => {
            return clients.updateIn([connection.client.id], x => createClient(connection));
        })
        .subscribe(clients$);

    clients$
        .distinctUntilChanged(x => {
            return x.map(x => x.get('id'));
        })
        .subscribe(x => {
            console.log(': num clients:', x.size);
            x.forEach(function (val, key) {
            	console.log(val.get('id'));
            });
            console.log('clients chenged');
        });

    //Rx.Observable.prototype.withLatestFromOnly = function (arg) {
    //    return this.map(x => arg.getValue());
    //};
    //
    ///**
    // * Client Filter
    // */
    //Rx.Observable
    //    .interval(1000)
    //    .withLatestFromOnly(clients$)
    //    .map(x => x.filter(client => getTime() - client.get('heartbeat') < maxHeartbeat))
    //    .subscribe(clients$);
    //
    //
    //
    //
    //clients$
    //    .distinctUntilChanged(x => x.map(x => x.get('id')))
    //    .subscribe(function (clients) {
    //        console.log('----~----~----~----', clients.size);
    //        console.log('UPDATED BRO', clients.toJS());
    //    });

}

function createClient (incoming) {
    return Immutable.Map({
        id: incoming.client.id,
        heartbeat: new Date().getTime()
    }).merge(incoming.data);
}

function getTime () {
    return new Date().getTime();
}

function updateHeartbeat(client) {
    return client.set('heartbeat', getTime());
}

module.exports.track = track;