'use strict';

var browserSync = require('../../../');
var opts        = require('../../../lib/default-options');
var merge       = require('../utils').optmerge;
var files       = require('../../../lib/files');
var assert      = require('chai').assert;
var socket      = require("socket.io-client");

describe.only('Client Connections', function () {
    it('registers a client', function (done) {
        browserSync.create({}, function (err, bs) {
            var opts = bs.options.toJS();
            var connectionUrl = opts.urls.local + opts.socket.namespace;

            bs.io.sockets.on('connection', function (client) {
                client1.emit('Client.register', {
                    client: {
                        id: 'shane',
                    },
                    data: {

//GET /questions/16350673/depend-on-a-branch-or-tag-using-a-git-url-in-a-package-json HTTP/1.1
//Host: stackoverflow.com
//Connection: keep-alive
//Pragma: no-cache
//Cache-Control: no-cache
//Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8
//Upgrade-Insecure-Requests: 1
//User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36
//Referer: https://www.google.co.uk/
//Accept-Encoding: gzip, deflate, sdch
//Accept-Language: en-US,en;q=0.8
//Cookie: __utma=140029553.411651930.1372201274.1389560045.1389565803.339; __qca=P0-75447263-1419702105888; prov=f0737c83-fad4-4e93-ba8e-a8f5ab3f042f; __cfduid=d08dd11cea41bdc35d7e62aa7f9f79ea31438011279; _ga=GA1.2.411651930.1372201274
                    }
                });
            });

            bs.clients$
                .subscribe(function (val) {
                    console.log('valu)', val);
                });

            var client1 = socket(connectionUrl, {
                path: opts.socket.socketIoOptions.path,
                headers: {
                    referer: "https://google.co.uk"
                }
            });
            process.nextTick(function () {
                client1.emit('whatevs', 'shane');
            });
        });
    });
});