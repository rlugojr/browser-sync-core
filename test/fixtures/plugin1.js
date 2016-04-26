module.exports = {
    initAsync: function (bs, opts, done) {
        bs.pluginUpdates('Plugin1')
            .do(function() {console.log(x)})
            .subscribe();

        //var optStream = bs.plugin('option:middleware', function (mw) {
        //    return mw.concat({
        //        id: 'mymw',
        //        route: '',
        //        handle: function (req, res, next) {
        //            console.log(req.url);
        //            next();
        //        }
        //    })
        //}).subscribe(x => console.log('MW set 1'));
        //bs.plugin('files:watcher', 'core')
        //    .filter(x => x.event !== 'add')
        //    .subscribe(x => console.log('from plugin', x.file, x.event));
        //bs.plugin('option:plugins', function (plugins) {
        //    return plugins.map(function (plug) {
        //        if (plug.getIn(['module', 'plugin:name']) === 'Plugin1') {
        //            return plug.set('active', false);
        //        }
        //        return plug;
        //    });
        //}).subscribe();
        //bs.updatePlugin('Plugin1', function (plug) {
        //    return plug.set('active', true);
        //}).subscribe();

        done();
    },
    'plugin:name': 'Plugin1',
    'browser-sync:ui': {
        "hooks": {
            "markup": "./index.html",
            "templates": [
                "./ui/template1.html"
            ],
            "client:js": [
                "./plugin1.js"
            ]
        }
    }
};
