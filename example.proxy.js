const connect = require('connect');
const http = require('http');
const fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

var app = connect();

const https = require('https');
// console.log(fs.readFileSync(config.certs.key));
// console.log(fs.readFileSync(config.certs.cert));
var server = https.createServer({
    key:  fs.readFileSync('server/certs/server.key'),
    cert: fs.readFileSync('server/certs/server.crt')
}, app);
app.use(function (req, res) {
    res.end('shane');
})
server.listen();
var add = server.address();
var url = 'https://localhost:' + add.port;

const request = require('supertest');


https.get(url, (res) => {
    console.log('statusCode: ', res.statusCode);
    console.log('headers: ', res.headers);

    res.on('data', (d) => {
        process.stdout.write(d);
    });

}).on('error', (e) => {
    console.error(e);
});
