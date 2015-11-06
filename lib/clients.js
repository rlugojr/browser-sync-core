function track(connections$, options$) {

    var events  = require('events');
    var emitter = new events.EventEmitter();
    var Steward = require('emitter-steward');
    var steward = new Steward(emitter);

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
        .subscribe(function (x) {
            console.log('client connected', x.client.id);
        });

    ///**
    // * Create a map of unique browser sessions
    // */
    //    .do(client => {
    //
    //        var ua = client.handshake.headers['user-agent'];
    //
    //        client.on('Client.heartbeat', function (incoming) {
    //            var options       = optSub.getValue();
    //            if (!options.hasIn(['clientOptions', incoming.client.id])) {
    //                return;
    //            }
    //            clients.onNext(
    //                options.get('clientOptions')
    //                    .update(incoming.client.id, x => {
    //                        return x.set('heartbeat', new Date().getTime())
    //                    })
    //            );
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

module.exports.track = track;