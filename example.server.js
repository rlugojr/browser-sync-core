var bs = require('./');

bs.create({

}).subscribe(bs => {
    // console.log(bs.options.get('plugins').toJS());
    setTimeout(function () {
        bs.cleanup();
    }, 1000);
});

