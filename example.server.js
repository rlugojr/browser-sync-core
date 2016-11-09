var bs = require('./');

bs.create({
    watch: [
        {
            match: '*.json',
        },
        {
            match: '*.js'
        }
    ],
    watchDebounce: 2000,
    plugins: [{
        module: {
            "plugin:name": "my-plugin",
            init: function (bs) {
                // bs.getWatcher('my-plugin').subscribe(x => {
                //     console.log(x);
                // });
            }
        },
        options: {
            watch: "*.js"
        }
    }],
    online: false,
}).subscribe(bs => {
    // console.log(bs.options.get('plugins').toJS());
    // setTimeout(function () {
    //     // bs.cleanup();
    // }, 1000);
});

