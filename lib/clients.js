var Rx = require('rx');
var Immutable = require('immutable');
var transform    = require('./transform-options');

function track(connections$, options$) {

    const events   = require('events');
    const emitter  = new events.EventEmitter();
    const Steward  = require('emitter-steward');
    const steward  = new Steward(emitter);
    const clients$ = new Rx.BehaviorSubject(Immutable.OrderedMap());

    //console.log(options$.getValue().getIn(['clientOptions', 'default']).toJS());

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
            console.log('client connected', x.client.id);
        });

    /**
     * With every connection
     */
    connections$
        .withLatestFrom(clients$, (connection, clients) => {
            return {
                connection: connection,
                clients: clients
            }
        })
        .flatMap(x => {
            var register$ = Rx.Observable.fromEvent(x.connection, 'Client.register');
            return Rx.Observable.zip(register$, Rx.Observable.just(x.clients));
        })
        .map(function (client) {
        	if (client.hasIn(client.id)) {
                console.log('HAS', client.id);
            } else {
                console.log('NOT', client.id);
            }
            return clients;
        })
        .subscribe(function (val, val2) {
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