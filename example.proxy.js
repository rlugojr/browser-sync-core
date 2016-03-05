var bs = require('./');
var con = require('connect');
var http = require('http');

var app = con();
app.use('/api/shane', function (req, res, next) {
	res.end('shane');
});

var server = http.createServer(app);
server.listen();
var addr = server.address();
var url = 'http://localhost:' + addr.port;

bs.create({
    serveStatic: ['test/fixtures', '.'],
    watch: 'test/fixtures',
    watchDebounce: 4000,
    proxy: {
        route: '/api',
        target: url
    }
}).subscribe(bs => {
    //console.log(opts.options.get('urls'));
    //console.log(opts.get('urls'));
    //bs.connections$.subscribe(x => console.log('CONNECTION', x.id));
    //bs.registered$.subscribe(x => console.log('Registration', x.connection));

    bs.watchers$.pluck('event').subscribe(x => console.log('File changed', x.event, x.path));
    bs.coreWatchers$.pluck('event').subscribe(x => console.log('File changed', x.event, x.path));
    //console.log(bs.options.get('urls').toJS());
    //console.log(bs.options.get('middleware').toJS());
});


