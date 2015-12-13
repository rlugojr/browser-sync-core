'use strict';

const assert    = require('chai').assert;
const bs        = require('../../../');
const Immutable = require('immutable');
const fromJS    = Immutable.fromJS;
const List      = Immutable.List;
const isList    = Immutable.List.isList;
const isMap     = Immutable.Map.isMap;
const watcher   = require('../../../lib/plugins/watcher');

describe('uses file-watcher plugin with custom fn', function () {
    it('accepts array of objects', function () {
        const fn1 = () => {};
        const fn2 = () => {};
        const actual = watcher.transformOptions(fromJS({
            files: [
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
        }));

        const first = actual.getIn(['files', 0]);
        const second = actual.getIn(['files', 1]);
        assert.equal(first.get('fn'), fn1);
        assert.equal(second.get('fn'), fn2);
    });
    it('accepts single string with custom fn', function () {
        const fn1 = () => {};
        const actual = watcher.transformOptions(fromJS({
            files: {
                match: '*.html',
                fn: fn1
            }
        }));

        const first  = actual.getIn(['files', 0]);
        assert.equal(first.get('fn'), fn1);
    });
    it('accepts single Object with match as string', function () {
        const fn1 = () => {};
        const actual = watcher.transformOptions(fromJS({
            files: {
                match: '*.html',
                throttle: 1000,
                fn: fn1,
                options: {
                    ignored: ['*.txt']
                }
            }
        }));

        const first = actual.getIn(['files', 0]);
        assert.equal(first.get('fn'), fn1);
    });
    it('accepts single Object with array of strings', function () {
        const fn1 = () => {};
        const actual = watcher.transformOptions(fromJS({
            files: {
                match: ['*.html', '*.css'],
                fn: fn1
            }
        }));

        const first  = actual.getIn(['files', 0]);
        assert.equal(first.get('fn'), fn1);
    });
});
