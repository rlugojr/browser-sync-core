var bs = require('./');
//var m = require('meow');

//console.log(m().flags);
//
bs.create({
    proxy: 'http://localhost:3000/',
    plugins: './test/fixtures/plugin2.js'
}, function (err, bs) {
    console.log(err);
    console.log(bs.options.get('urls'));
});
    //strict: false,
    //proxy: {
//        target: 'http://localhost:3000/',
//        ws: true
//    },
//    watch: [
//        '*.js',
//        'test/fixtures'
//    ],
//    //devMode: true,
//    //rewriteRules: [
//    //    {
//    //        match: "http://static.bbci.co.uk/frameworks/barlesque/3.7.3/orb/4/style/orb.min.css",
//    //        replace:
//    //    }
//    //]
//    plugins: [
//        //'/Users/shakyshane/Sites/browser-sync-modules/browser-sync-cp', // laptop
//        //'/Users/shakyshane/Sites/browser-sync-modules/browser-sync-cp', // laptop
//        //'/Users/shakyshane/sites/oss/UI'
//    ]
//}, function (err, bs) {
//    //console.log('err', err);
//    if (err) {
//        return;
//    }
//    //setTimeout(() => {
//    //    bs.cleanup(function () {
//    //
//    //    });
//    //}, 4000);
//    console.log(bs.options.get('urls').toJS());
//});
