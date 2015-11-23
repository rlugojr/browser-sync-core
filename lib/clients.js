'use strict';

var Rx        = require('rx');
var Immutable = require('immutable');
var transform = require('./transform-options');
var fromEvent = Rx.Observable.fromEvent;
var utils     = require('./utils');
//Rx.config.longStackSupport = true;

function track(bsSocket, options$, cleanups) {

    const connections$ = Rx.Observable.fromEvent(bsSocket.clients, 'connection');
    const events       = require('events');
    const Steward      = require('emitter-steward');
    const emitter      = new events.EventEmitter();
    const steward      = new Steward(emitter);
    const clients$     = new Rx.BehaviorSubject(Immutable.OrderedMap());

    /**
     * todo: remove emitter steward
     */
    cleanups.push(function () {
        emitter.removeAllListeners();
        steward.destroy();
    });

    /**
     * Available Clients
     */
    const int = Rx.Observable
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
    const sub1 = connections$
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
            x.client.emit('connection', x.options.get('clientOptions'));
        })
        .subscribe(function () {});

    /**
     * With every connection
     */
    const registered$ = connections$
        .flatMap(client => {
            return Rx.Observable.create(obs => {
                client.on('Client.register', connection => {
                    obs.onNext({client, connection});
                });
                client.on('disconnect', () => {
                    obs.onCompleted();
                });
            });
        }).share();

    const sub2 = registered$
        .withLatestFrom(clients$, options$, (x, clients, options) => {
            const newClients = clients.updateIn([x.connection.client.id], () => {
                return createClient(x.client, x.connection, options.get('clientOptions'));
            });
            return newClients;
        })
        .map((x, i) => {
            return x;
        })
        .subscribe(clients$);

    cleanups.push(function () {
        int.dispose();
        sub1.dispose();
        sub2.dispose();
    });

    return {
        clients$,
        connections$,
        registered$
    };
}

/**
 * @param {Socket.io} client socket io client instance
 * @param {{client: {id: string}, data: object}} incoming
 * @param {Immutable.Map} clientOptions
 * @returns {Map<K, V>|Map<string, V>}
 */
function createClient (client, incoming, clientOptions) {

    const ua  = client.handshake.headers['user-agent'];
    const ref = client.handshake.headers['referer'];

    const newClient = {
        ua: ua,
        id: incoming.client.id,
        heartbeat: new Date().getTime(),
        referer: '',
        url: {},
        browser: {
            type: utils.getUaString(ua)
        },
        options: clientOptions.toJS()
    };

    if (ref) {
        newClient.referer = ref;
        newClient.url     = require('url').parse(ref);
    }

    return Immutable.fromJS(newClient).mergeDeep(incoming.data);
}

module.exports.track = track;