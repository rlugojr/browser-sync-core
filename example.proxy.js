var bs = require('./');

bs.create({
    strict: false,
    proxy: 'http://www.bbc.co.uk',
    devMode: true,
    plugins: [
        //'/Users/shakyshane/Sites/browser-sync-modules/browser-sync-cp', // laptop
        //'/Users/shakyshane/Sites/browser-sync-modules/browser-sync-cp', // laptop
        './lib/plugins/proxy',
        './lib/plugins/404'
        //'/Users/shakyshane/sites/oss/UI'
    ],
    externals: {
        clientJs: __dirname + '/client/'
        //clientJs: '/Users/shakyshane/code/bs-client' // laptop
        //clientJs: '/Users/shakyshane/sites/oss/browser-sync-client/' // home imac
    }
    //minify: false
}, function (err, bs) {
    //console.log('err', err);
    if (err) {
        return;
    }
    console.log(bs.options.get('urls').toJS());
});
