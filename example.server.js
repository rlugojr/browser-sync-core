var bs = require('./');

bs.create({
    strict: false,
    serveStatic: [
        'test/fixtures'
    ],
    middleware: [
        {
            route: "/shane",
            handle: function (req, res) {
                return res.end('<html>shane is cool</html>');
            }
        }
    ],
    // watchDebounce: 2000,
    //watchDelay: 2000,
    watch: [
        //"test/fixtures"
        {
            debounce: 2000,
            match: 'test/fixtures/*.html'
        },
        {
            debounce: 500,
            match: 'test/fixtures/**/*.css'
        }
        //{
        //{
        //    match: 'test/fixtures/*.html',
        //    fn: function (event, path, x) {
        //        console.log(event, path);
        //        this.reload();
        //    }
        //}
        //}
    ],
    // proxy: {
    //     target: 'https://www.browsersync.io',
    //     id: 'Shane Proxy'
    // },
    // scheme: "https",
    plugins: []
}).subscribe(bs => {

    console.log(bs.options.get('urls'));

    // setInterval(function () {
    //     bs.reload();
    // }, 2000);

    // bs.setOption('proxy', function (proxies) {
    //     return 'http://wearejh.com';
    // }).subscribe();
    //
    // setTimeout(function () {
    //     bs.setOption('proxy', function (proxies) {
    //         return 'http://www.bbc.co.uk';
    //     }).subscribe();
    // }, 5000);
    //
    // setTimeout(function () {
    //     bs.setOption('proxy', function (proxies) {
    //         return 'http://wearejh.com';
    //     }).subscribe();
    // }, 10000);

    // setTimeout(function () {
    //     bs.setOption('proxy', function (proxies) {
    //         return {
    //             target: 'http://wearejh.com',
    //             id: 'MY TING',
    //             route: "/api"
    //         };
    //     }).subscribe();
    // }, 2000);
    //
    // setTimeout(function () {
    //     bs.setOption('proxy', function (proxies) {
    //         return proxies.concat({
    //             target: 'http://m2.wearejh.com',
    //             id: 'MY TING',
    //             route: "/api2"
    //         });
    //     }).subscribe();
    // }, 3000);
});

