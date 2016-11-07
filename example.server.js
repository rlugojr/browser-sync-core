var bs = require('./');

bs.create({
    watch: [
        {
            match: '*.json',
            debounce: 2000
        }
    ],
    watchDelay: 1000,
    online: false,
}).subscribe(bs => {
    // console.log(bs.options.get('plugins').toJS());
    // setTimeout(function () {
    //     // bs.cleanup();
    // }, 1000);
});

