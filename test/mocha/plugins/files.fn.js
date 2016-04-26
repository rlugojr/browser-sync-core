const assert    = require('chai').assert;
const Immutable = require('immutable');
const watcher   = require('../../../dist/plugins/watch');
const startup   = require('../../../dist/startup');
const opts      = require('../../../dist/incoming-options');

function process(obj) {
    return watcher.transformOptions(startup.process(opts.merge(obj), startup.pipeline));
}

describe('uses file-watcher plugin with custom fn', function () {
    it('accepts array of objects', function () {
        const fn1 = function() {};
        const fn2 = function() {};
        const actual = process({
            watch: [
                {
                    match: '*.html',
                    fn: fn1
                },
                {
                    match:   ['*.css', 'templates/*.jade'],
                    fn: fn2,
                    options: {
                        ignored: '*.txt'
                    }
                }
            ]
        });

        const first = actual.getIn(['watch', 0]);
        const second = actual.getIn(['watch', 1]);
        assert.equal(first.get('fn'), fn1);
        assert.equal(second.get('fn'), fn2);
    });
    it('accepts single string with custom fn', function () {
        const fn1 = function() {};
        const actual = process({
            watch: {
                match: '*.html',
                fn: fn1
            }
        });

        const first  = actual.getIn(['watch', 0]);
        assert.equal(first.get('fn'), fn1);
    });
    it('accepts single Object with match as string', function () {
        const fn1 = function() {};
        const actual = process({
            watch: {
                match: '*.html',
                throttle: 1000,
                fn: fn1,
                options: {
                    ignored: ['*.txt']
                }
            }
        });

        const first = actual.getIn(['watch', 0]);
        assert.equal(first.get('fn'), fn1);
    });
    it('accepts single Object with array of strings', function () {
        const fn1 = function() {};
        const actual = process({
            watch: {
                match: ['*.html', '*.css'],
                fn: fn1
            }
        });

        const first  = actual.getIn(['watch', 0]);
        assert.equal(first.get('fn'), fn1);
    });
});
