const assert = require('chai').assert;
const bs = require('../../../');
const Im = require('immutable');
const watcher = require('../../../lib/plugins/watcher');

describe('Reacting to file-change events', function () {
    it('listens to file watcher events', function (done) {
        bs.create({
            plugins: [
                require('../../../lib/plugins/watcher')
            ],
            files: 'test/fixtures/index.html'
        }, function (err, bs) {
            assert.isTrue(Im.List.isList(bs.watchers), 'bs.watchers is a List');
            assert.equal(bs.watchers.size, 1, 'bs.watchers has size 1');
            bs.cleanup(x => done());
        });
    });
    it('listens to file watcher events in core namespace', function (done) {
        bs.create({
            plugins: [
                require('../../../lib/plugins/watcher')
            ],
            files: [
                'test/fixtures/index.html',
                'test/fixtures/css/*.css'
            ]
        }, function (err, bs) {

            const s = bs.watchers$
                .pluck('event')
                .take(2)
                .toArray()
                .subscribe(x => {

                    assert.equal(x.length, 2);

                    assert.notEqual(x[0].id, x[1].id) // separate IDs

                    assert.equal(x[0].namespace, 'core'); // second watcher
                    assert.equal(x[1].namespace, 'core'); // second watcher

                }, e => {}, () => bs.cleanup(x => {
                    s.dispose();
                    done();
                }));

            bs.watchers.get(0).watcher._events.all('change', 'test/fixtures/index.html');
            bs.watchers.get(1).watcher._events.all('change', 'test/fixtures/css/style.css');
        });
    });
    it('listens to file watcher events in plugin', function (done) {
        bs.create({
            plugins: [
                require('../../../lib/plugins/watcher'),
                {
                    module: {
                        init: () => {},
                        'plugin:name': 'my plugin'
                    },
                    options: {
                        files: 'test/fixtures/css/*.css'
                    }
                }
            ],
            files: [
                'test/fixtures/index.html'
            ]
        }, function (err, bs) {

            const s = bs.watchers$
                .pluck('event')
                .take(2)
                .toArray()
                .subscribe(x => {

                    assert.equal(x[0].namespace, 'core'); // second watcher
                    assert.equal(x[1].namespace, 'my plugin'); // second watcher

                }, e => {}, () => bs.cleanup(x => {
                    s.dispose();
                    done();
                }));

            bs.watchers.get(0).watcher._events.all('change', 'test/fixtures/index.html');
            bs.watchers.get(1).watcher._events.all('change', 'test/fixtures/css/style.css');
        });
    });
});
