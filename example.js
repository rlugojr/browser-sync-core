var Rx                = require('rx');
var Immutable         = require('immutable');
var maxHeartbeat      = 5000;
var heartbeatInterval = 1000;

// Initial client list
var clients$ = new Rx.BehaviorSubject(Immutable.OrderedMap({
    'client1': createClient({id: '123456'}),
    'client2': createClient({id: '122112'})
}));

// Fake users to simulate connections
var users = [
    {
        id: 'client3'
    },
    {
        id: 'client4'
    },
    {
        id: 'client5'
    }
];

// Send fake heartbeats very second for 3 items
var fakeConnections$ = Rx.Observable.create(function (obs) {
    var count = 0;
	setInterval(function () {
		obs.onNext(users[count]);
        count += 1;
        if (count === users.length) {
            count = 0;
        }
	}, 1000);
}).share();

/**
 * If a client already exists, update the timestamp
 * If it's a new client, add a new entry and return
 */
fakeConnections$
    .withLatestFrom(clients$, (connection, clients) => {
        return {
            connection: connection,
            clients: clients
        }
    })
    .map(x => {
        // Client exists, update the heartbeat
        if (x.clients.hasIn([x.connection.id])) {
            return x.clients.update(x.connection.id, updateHeartbeat);
        }

        // New client, add to the collection
        return x.clients.set(x.connection.id, createClient(x.connection));
    })
    .subscribe(clients$);

/**
 * Heartbeat filter. Filter the clients every second to exclude those
 * with a heartbeat not within the threshold
 */
var source = Rx.Observable
    .interval(1000)
    .withLatestFrom(clients$, (_, x) => x)
    .map(x => x.filter(client => getTime() - client.get('heartbeat') < maxHeartbeat))
    .subscribe(clients$);

var count = 0;

/**
 * Finally, create a client stream that only includes
 * updates to the clients
 */
clients$
    .distinctUntilChanged(x => x.map(x => x.get('id')))
    .subscribe(function (clients) {
        console.log(clients.map(x => x.get('id')));
        count += 1;
        console.log('call', count);
        console.log('--~~');
        console.log(clients.toJS());
    });

