/// <reference path="../../typings/main.d.ts" />
import NodeURL  = require('url');
import SocketIO = require('socket.io');
import * as clients from './clients.d';

const Rx         = require('rx');
const Observable = Rx.Observable;
const just       = Rx.Observable.just;
const empty      = Rx.Observable.empty;
const assign     = require('object-assign');
const debug      = require('debug')('bs:clients');

import utils      from '../utils';
import Immutable = require('immutable');

import {parse} from 'url';
import {BrowsersyncOptionsMap} from "../browser-sync.d";
import {BrowserSync} from "../browser-sync";

export const ClientEvents = {
    register: "Client.register"
};

interface ClientSocketEvent {
    id: string
    socketId: string
    event: string
    data: any
    client: SocketIO.Socket
}

module.exports['plugin:name'] = "Browsersync Clients";

export function init (bs: BrowserSync) {

    const connections$ = Rx.Observable.fromEvent(bs.bsSocket.clients, 'connection');
    const clients$     = new Rx.BehaviorSubject(Immutable.OrderedMap());

    const blank        = {locked: false, id: '', socketId: ''};
    var controller     = new Rx.BehaviorSubject(blank);

    /**
     * Listen for incoming connections that occur
     * every time the browser page is reloaded or
     * when a client reconnects
     * Add client sharing event such as scroll click etc
     */
    const clientEvents$ = connections$
        .withLatestFrom(bs.options$)
        .flatMap(x => {
            const client:  SocketIO.Socket = x[0];
            const options: BrowsersyncOptionsMap = x[1];

            client.emit('connection', options.get('clientOptions'));

            return Rx.Observable.create(function (obs) {
                options.getIn(['clientOptions', 'events']).forEach(event => {
                    client.on(event, (data) => {
                        obs.onNext({client, event, data});
                    });
                });
            });
        })
        .withLatestFrom(clients$)
        .flatMap((obj) => {
            const evt     = obj[0];
            const clients = obj[1];
            let match   = clients.filter(x => x.get('socketId') === evt.client.id);
            if (match.size) {
                match = match.toList();
                return just(<ClientSocketEvent>{
                    id:       match.toList().getIn([0, 'id']),
                    socketId: match.toList().getIn([0, 'socketId']),
                    event:    evt.event,
                    data:     evt.data,
                    client:   evt.client
                });
            }
            return empty();
        }).share();

    /**
     * Select the currently emitting socket and set it
     * as the controller
     */
    trackController(clientEvents$, controller)
        .do(controller)
        .subscribe();

    // ------------------------------------------------------
    // Controller resets
    // ------------------------------------------------------

    /**
     * Every second, wipe the current controller by setting
     * it to the blank default
     */
    Rx.Observable
        .interval(1000)
        .map(x => blank)
        .subscribe(controller);

    /**
     * Only broadcast events when the event origin
     * was the current controller
     */
    clientEvents$
        .withLatestFrom(controller)
        .flatMap(function (x) {
            const evt: ClientSocketEvent = x[0];
            const ctrl = x[1];
            if (ctrl.id === '') {
                debug('✔  ALLOW EVENT, CONTROLLER NOT SET');
                debug('└─ ', evt);
                return just(evt);
            } else if (ctrl.id === evt.id) {
                debug('✔ ALLOW EVENT, CTRL ID === EVENT ID');
                debug('└─ ', evt);
                return just(evt);
            } else {
                debug('PROBS IGNORE EVENT id:', evt.id, 'CTRL id:', ctrl.id);
            }
            return empty();
        }).subscribe(x => {
        x.client.broadcast.emit(x.event, x.data);
    });


    // ------------------------------------------------------
    // CLIENT REGISTRATIONS
    // ------------------------------------------------------

    /**
     * Every 6 seconds, look at the array of clients that socket.io maintains.
     * Use this to filter our clients$ stream so that it is cleaned of dead clients.
     * This is done because socket.io has a very accurate way of tracking connections,
     * but we store/think about clients in a very different way (tab sessions persisting)
     */
    const int = Rx.Observable
        .interval(6000)
        .map(x => Object.keys(bs.bsSocket.clients.sockets))
        //.do(x => console.log('Filtering clients'))
        .withLatestFrom(clients$, (sockets, clients) => {
            return clients.filter(client => {
                return sockets.indexOf(client.getIn(['socketId'])) > -1;
            });
        })
        .subscribe(clients$);

    /**
     * With every incoming connection, add a listener
     * for the Client.register event that each browser
     * will emit once initialized. Note: this is very different
     * from a socket CONNECTION as these registrations are unique
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
        .withLatestFrom(clients$, bs.options$, (x, clients, options: BrowsersyncOptionsMap) => {
            const client:     SocketIO.Socket = x.client;
            const connection: clients.IncomingClientRegistration = x.connection;
            return clients.updateIn([connection.client.id], () => {
                return createClient(client, connection, options.get('clientOptions'));
            });
        })
        .subscribe(clients$);

    bs.clients$     = clients$;
    bs.connections$ = connections$;
    bs.registered$  = registered$;

    /**
     * Retrieve a socket.io client from a Browsersync client id.
     * Browsersync client ID's persist and survive a refresh
     * so consumers can use that ID to retrieve the socket.io
     * client which allow them to target events to a single
     * client.
     * @param {string} id - Browsersync client ID (Note: this is different from the socket.io id)
     * @returns {Socket|Boolean}
     */
    bs.getSocket = function (id) {
        const match = clients$.getValue().filter(x => x.get('id') === id).toList().get(0);
        if (match) {
            return bs.bsSocket.clients.sockets[match.get('socketId')];
        }
        return false;
    };

    /**
     * Set individual client options
     * @param {String} id - either a bs-client ID (not a socket.io id) or 'default'
     * @param {Array|String} selector - option selector, eg: ['ghostMode', 'clicks']
     * @param {Function} fn - transform function will be called with current value
     * @returns {Observable}
     */
    bs.setClientOption = function (id, selector, fn) {
        return Observable
            .just(clients$.getValue())
            .map(clients => {
                return clients.updateIn([id, 'options'].concat(selector), fn);
            })
            .do(clients$.onNext.bind(clients$));
    };

    /**
     * Set an option for all clients, overriding any previously set items
     * @param {Array|String} selector
     * @param {function} fn - transformation function will be called with current value
     * @returns {Rx.Observable}
     */
    bs.overrideClientOptions = function (selector, fn) {
        return Observable
            .just(clients$.getValue())
            .map(clients => {
                return clients.map(client => {
                    return client.updateIn(['options'].concat(selector), fn);
                });
            })
            .do(clients$.onNext.bind(clients$));
    };

    return () => {
        int.dispose();
        sub2.dispose();
    }
}

function createClient (client: SocketIO.Socket, incoming: clients.IncomingClientRegistration, clientOptions) {

    const ua      = client.handshake.headers['user-agent'];
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


/**
 * Take a stream of incoming actionSync events + the current controller
 * and use the controller to determine if the current event is valid
 * (ie: it's from the same browser)
 */
function trackController (incoming, controller) {
    return incoming
        .withLatestFrom(controller)
        .flatMap(x => {

            const incomingEvent     = x[0];
            const currentController = x[1];
            // console.log(incomingEvent.socketId, currentController.id);

            /**
             * Controller has not been set, therefore we allow this event
             * through (as this will in turn cause the controller to be set)
             */
            if (currentController.id === '') {
                return just({locked: false, id: incomingEvent.id, socketId: incomingEvent.socketId});
            }

            /**
             * If the controller ID matches the incoming event ID
             * we return the controller, but re-set the socketId
             * as this could change (ie: every time the browser reloads)
             */
            if (currentController.id === incomingEvent.id) {
                return just(assign(currentController, {socketId: incomingEvent.socketId}));
            }

            /**
             * If we reach here, the controller was set, but the
             * controller.id didn't match the incoming event.id. So we bail here
             * and don't pass any value through. This is how we essentially
             * ignore all events from any browser that is not currently deemed
             * the controller.
             */
            return empty();
        });
}
