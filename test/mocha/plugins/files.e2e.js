const assert = require('chai').assert;
const bs = require('../../../');
const Im = require('immutable');
const watcher = require('../../../dist/plugins/watch');

describe('Reacting to file-change events', function () {
    it('listens to file watcher events', function (done) {
        bs.create({
            watch: 'test/fixtures/index.html'
        }).subscribe(function (bs) {
            assert.isTrue(Im.List.isList(bs.watchers), 'bs.watchers is a List');
            assert.equal(bs.watchers.size, 1, 'bs.watchers has size 1');
            bs.cleanup(function () {done()});
        });
    });
    it('listens to file watcher events in core namespace', function (done) {
        bs.create({
            watch: [
                'test/fixtures/index.html',
                'test/fixtures/css/*.css'
            ]
        }).subscribe(function (bs) {

            const s = bs.watchers$
                .pluck('event')
                .take(2)
                .toArray()
                .subscribe(function (x) {

                    assert.equal(x.length, 2);

                    assert.notEqual(x[0].eventUID, x[1].eventUID) // separate IDs

                    assert.equal(x[0].namespace, 'core'); // second watcher
                    assert.equal(x[1].namespace, 'core'); // second watcher

                }, function() {}, function() {
                    bs.cleanup(function() {
                        s.dispose();
                        done();
                    });
                });

            bs.watchers.get(0).watcher._events.all('change', 'test/fixtures/index.html');
            bs.watchers.get(1).watcher._events.all('change', 'test/fixtures/css/style.css');
        });
    });
    it('listens to file watcher events in plugin', function (done) {
        bs.create({
            plugins: [
                {
                    module: {
                        init: function (){},
                        'plugin:name': 'my plugin'
                    },
                    options: {
                        watch: 'test/fixtures/css/*.css'
                    }
                }
            ],
            watch: [
                'test/fixtures/index.html'
            ]
        }).subscribe(function (bs) {

            const s = bs.watchers$
                .pluck('event')
                .take(2)
                .toArray()
                .subscribe(function(x) {

                    assert.equal(x[0].namespace, 'core'); // second watcher
                    assert.equal(x[1].namespace, 'my plugin'); // second watcher

                }, function(){}, function(){
                    bs.cleanup(function () {
                        s.dispose();
                        done();
                    });
                });

            bs.watchers.get(0).watcher._events.all('change', 'test/fixtures/index.html');
            bs.watchers.get(1).watcher._events.all('change', 'test/fixtures/css/style.css');
        });
    });
});
