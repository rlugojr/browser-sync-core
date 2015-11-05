var Rx = require('rx');
var Immutable = require('immutable');

var clients = Immutable.fromJS({
    'default': createClient({id: 'default'}),
    'client1': createClient({id: '123456'})
});

var users = [
    {
        id: 'client2'
    },
    {
        id: 'client3'
    },
    {
        id: 'client4'
    }
];

var clients$ = new Rx.BehaviorSubject(clients);

var connections$ = Rx.Observable.create(function (obs) {
    var count = 0;
	var int = setInterval(function () {
		obs.onNext(users[count]);
        count += 1;
        if (count === users.length) {
            count = 0;
        }
	}, 1050);
}).share();

connections$
    .withLatestFrom(clients$, (connection, clients) => {
        return {
            connection: connection,
            clients: clients
        }
    })
    .map(x => {
        if (x.clients.hasIn([x.connection.id])) {
            console.log('EXISTS:', x.connection.id);
            return x.clients.update(x.connection.id, function (client) {
            	return client.set('heartbeat', new Date().getTime());
            })
        } else {
            return x.clients.set(x.connection.id, createClient(x.connection));
        }
        return x.clients;
    })
    .subscribe(clients$);

function createClient (incoming) {
    return Immutable.Map({
        id: incoming.id,
        heartbeat: new Date().getTime()
    });
}

var source = Rx.Observable
    .interval(1000)
    .withLatestFrom(clients$, (_, x) => x)
    .do(function (clients) {
        console.log('--~~--~~--~~--~~--~~--~~--~~--~~--~~--');
        console.log(clients.size);
    	//clients.toList().forEach(function (val, i) {
    	//	console.log('index:', i, 'id:', val.get('id'), 'hb', val.get('heartbeat'));
    	//})
    })
    .subscribe();
