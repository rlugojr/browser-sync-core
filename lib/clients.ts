/// <reference path="../typings/main.d.ts" />
import NodeURL  = require('url');
import SocketIO = require('socket.io');
import * as clients from './clients.d';

const Rx        = require('rx');
const just      = Rx.Observable.just;
const empty     = Rx.Observable.empty;
const Immutable = require('immutable');
const transform = require('./transform-options');
import utils from './utils';

import {parse} from 'url';
import {BrowsersyncOptionsMap} from "./browser-sync.d";

export const ClientEvents = {
    register: "Client.register"
};

function track(bsSocket, options$, cleanups) {

    const connections$ = Rx.Observable.fromEvent(bsSocket.clients, 'connection');
    const events       = require('events');
    const clients$     = new Rx.BehaviorSubject(Immutable.OrderedMap());


    var incoming       = new Rx.BehaviorSubject('');
    var controller     = new Rx.BehaviorSubject({locked: false, id: ''});
    var controller$    = controller.share();
    var controllerInt  = Rx.Observable.interval(1000);

    controllerInt.withLatestFrom(incoming, controller)
        .flatMap(x => {
            const incoming = x[1];
            const current  = x[2];
            if (current.locked) {
                return empty();
            }
            return just({locked: false, id: incoming});
        })
        .distinctUntilChanged()
        .subscribe(controller);

    /**
     * Every 6 seconds, look at the array of clients that socket.io maintains.
     * Use this to filter our clients$ stream so that it is cleaned of dead clients.
     * This is done because socket.io has a very accurate way of tracking connections,
     * but we store/think about clients in a very different way (tab sessions persisting)
     */
    const int = Rx.Observable
        .interval(6000)
        .map(x => bsSocket.clients.sockets.map(x => x.id))
        //.do(x => console.log('Filtering clients'))
        .withLatestFrom(clients$, (sockets, clients) => {
            return clients.filter(client => {
                return sockets.indexOf(client.getIn(['socketId'])) > -1;
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
        .withLatestFrom(options$)
        .flatMap(x => {

            const client:  SocketIO.Socket = x[0];
            const options: BrowsersyncOptionsMap = x[1];

            client.emit('connection', options.get('clientOptions'));

            return Rx.Observable.create(function (obs) {
                options.getIn(['clientOptions', 'events']).forEach(event => {
                    client.on(event, (data) => {
                        incoming.onNext(client.id);
                        obs.onNext({client, event, data});
                    });
                });
            });

        })
        .withLatestFrom(controller)
        .do(x => {
            const incoming   = x[0];
            const controller = x[1];

            if (incoming.client.id === controller.id) {
                incoming.client.broadcast.emit(incoming.event, incoming.data);
            }
        })
        .subscribe();


    /**
     * With every incoming connection, add a listener
     * for the Client.register event that each browser
     * will emit once initialized. Note: this is very different
     * from a socket CONNECTION as these registrations are uniqeue
     * and persisted across tab sessions.
     *
     * This creates a new stream that pairs the socket.io client
     * with the incoming client registration
     */
    const registered$ = connections$
        .flatMap((client: SocketIO.Socket) => {
            return Rx.Observable.create(obs => {
                client.on(ClientEvents.register, (connection: clients.IncomingClientRegistration) => {
                    obs.onNext({
                        client,
                        connection
                    });
                });
                client.on('disconnect', () => {
                    obs.onCompleted();
                });
            });
        }).share();

    /**
     * This looks at the registered$ stream (see above)
     * for each event it updates the clients$ array with updated timestamps/data
     * that is derived from calling createClient.
     *
     * This means that newly registered clients will be persisted, but also
     * any re-registrations (ie: browser reloads) will alo be updated each time.
     */
    const sub2 = registered$
        .withLatestFrom(clients$, options$, (x, clients, options: BrowsersyncOptionsMap) => {

            const client:     SocketIO.Socket = x.client;
            const connection: clients.IncomingClientRegistration = x.connection;

            return clients.updateIn([connection.client.id], () => {
                return createClient(client, connection, options.get('clientOptions'));
            });
        })
        .subscribe(clients$);

    cleanups.push({
        description: `Removing Observable subscriptions related to clients`,
        async: false,
        fn: function () {
            int.dispose();
            sub1.dispose();
            sub2.dispose();
        }
    });

    return {
        clients$,
        connections$,
        registered$
    };
}

function createClient (client: SocketIO.Socket, incoming: clients.IncomingClientRegistration, clientOptions) {

    const ua  = client.handshake.headers['user-agent'];
    const referer = client.handshake.headers['referer'];

    const newClient = <clients.Client>{
        ua: ua,
        id: incoming.client.id,
        heartbeat: new Date().getTime(),
        location: {},
        browser: {
            type: utils.getUaString(ua)
        },
        options: clientOptions.toJS(),
        socketId: client.id
    };

    if (referer) {
        newClient.location.referer  = referer;
        newClient.location.url      = parse(referer);
        newClient.location.fullPath = newClient.location.url.path + incoming.data.hash;
        newClient.location.fullUrl  = newClient.location.url.href + incoming.data.hash;
    }

    return Immutable.fromJS(newClient).mergeDeep(incoming.data);
}

module.exports.track = track;
