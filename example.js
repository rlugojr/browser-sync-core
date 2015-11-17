var bs = require('./lib/browser-sync');
bs.create({}, function (err, bs) {
    console.log('cleanup');
    bs.cleanup();
});
