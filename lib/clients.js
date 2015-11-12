'use strict';

var Rx        = require('rx');
var Immutable = require('immutable');
var transform = require('./transform-options');
var fromEvent = Rx.Observable.fromEvent;
var utils = require('./utils');
Rx.config.longStackSupport = true;

function track(bsSocket, options$) {

    const connections$ = Rx.Observable.fromEvent(bsSocket.clients, 'connection');
    const events       = require('events');
    const Steward      = require('emitter-steward');
    const emitter      = new events.EventEmitter();
    const steward      = new Steward(emitter);
    const clients$     = new Rx.BehaviorSubject(Immutable.OrderedMap());

    /**
     * Available Clients
     */
    Rx.Observable
        .interval(6000)
        .map(x => bsSocket.clients.sockets.map(x => x.id))
        //.do(x => console.log('Filtering clients'))
        .withLatestFrom(clients$, (sockets, clients) => {
            return clients.filter(x => {
                return sockets.indexOf(x.getIn(['socketId'])) > -1;
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
        .flatMap(client => {
            return Rx.Observable.create(obs => {
                client.on('Client.register', connection => {
                   obs.onNext({client, connection});
                });
                client.on('disconnect', () => {

                    obs.onCompleted();
                });
            })
        })
        .withLatestFrom(clients$, (x, clients) => {
            const newClients = clients.updateIn([x.connection.client.id], () => createClient(x.client, x.connection));
            return newClients;
            //console.log(x.connection);
        })
        .map((x, i) => {
            //console.log(i);
            return x;
        })
        .subscribe(clients$);
        //.flatMap(client => {
    //        return fromEvent(client, 'Client.register')
    //            .map(connection => ({client, connection}))
    //    })
    //    .subscribe(x => {
    //        console.log(x.client.id);
    //        console.log(x.connection);
    //    })
        //.combineLatest(clients$, (x, clients) => {
        //    console.log('connect');
        //    return clients.updateIn([x.client.id], x => createClient(x.connection));
        //})
        ////.distinctUntilChanged(x => x.map(x => x.get('id')))
        //.subscribe(clients$);

    return {
        clients$: clients$
    };
}

/**
 * @param {Socket.io} client socket io client instance
 * @param {{client: {id: string}, data: object}} incoming
 * @returns {Map<K, V>|Map<string, V>}
 */
function createClient (client, incoming) {
    const ua = client.handshake.headers['user-agent'];
    return Immutable.fromJS({
        id: incoming.client.id,
        heartbeat: new Date().getTime(),
        ua: ua,
        referer: client.handshake.headers['referer'],
        url: require('url').parse(client.handshake.headers['referer']),
        browser: {
            type: utils.getUaString(ua)
        }
    }).mergeDeep(incoming.data);
}


module.exports.track = track;
