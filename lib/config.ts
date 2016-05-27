'use strict';

const path = require('path');

const config = {
    controlPanel: {
        jsFile: '/js/app.js',
        baseDir: path.join(__dirname, 'control-panel')
    },
    templates: {
        scriptTag: path.join(__dirname, '/../templates/script-tags.tmpl'),
        connector: path.join(__dirname, '/../templates/connector.tmpl')
    },
    socketIoScript: '/client/dist/socket.io.min.js',
    configFile: 'default-config.js',
    userFile: 'bs-config.js',
    template: 'cli-template.js',
    httpProtocol: {
        path: '/__browser_sync__'
    },
    client: {
        main: path.join(__dirname + '/../client/dist/index.js'),
        mainDist: path.join(__dirname + '/../client/dist/index.min.js'),
        shims: '/client/client-shims.js',
        jsFilePath: '/browser-sync-client.js'
    },
    errors: {
        'server+proxy': 'Invalid config. You cannot specify both server & proxy options.',
        'proxy+https':  'Invalid config. You set https: true, but your proxy target doesn\'t reflect this.'
    },
    certs: {
        key: path.join(__dirname, '/../', 'server', 'certs', 'server.key'),
        cert: path.join(__dirname, '/../', 'server', 'certs', 'server.crt')
    }
};

export default config;
