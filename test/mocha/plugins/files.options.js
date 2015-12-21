'use strict';

const assert    = require('chai').assert;
const Immutable = require('immutable');
const isList    = Immutable.List.isList;
const isMap     = Immutable.Map.isMap;
const watcher   = require('../../../lib/plugins/watcher');
const startup   = require('../../../lib/startup');
const opts      = require('../../../lib/incoming-options');

function process(obj) {
    return watcher.transformOptions(startup.process(opts.merge(obj), startup.pipeline));
}

describe('uses file-watcher plugin with options', function () {
    it('accepts array of objects', function () {

        const actual = process({
            files: [
                {
                    match: '*.html'
                },
                {
                    match:   ['*.css', 'templates/*.jade'],
                    options: {
                        ignored: '*.txt'
                    }
                }
            ]
        });

        const first = actual.getIn(['files', 0]);
        assert.isUndefined(first.getIn(['options', 'ignored']));

        const second = actual.getIn(['files', 1]);
        assert.equal(second.getIn(['options', 'ignored']), '*.txt');
    });
    it('accepts array of strings', function () {

        const actual = process({
            files: [
                '*.html',
                '*.css'
            ]
        });

        const first  = actual.getIn(['files', 0]);
        const second = actual.getIn(['files', 1]);
        assert.isTrue(isMap(first.get('options')));
        assert.isTrue(isMap(second.get('options')));
    });
    it('accepts single string', function () {

        const actual = process({
            files: '*.html'
        });

        const first  = actual.getIn(['files', 0]);
        assert.isTrue(isMap(first.get('options')));
    });
    it('accepts single Object with match as string', function () {

        const actual = process({
            files: {
                match: '*.html',
                throttle: 1000,
                options: {
                    ignored: ['*.txt']
                }
            }
        });

        const first  = actual.getIn(['files', 0]);
        assert.equal(first.get('throttle'), 1000);
        assert.equal(first.getIn(['options', 'ignored', 0]), '*.txt');
    });
    it('accepts single Object with array of strings', function () {

        const actual = process({
            files: {
                match: ['*.html', '*.css']
            }
        });

        const first  = actual.getIn(['files', 0]);
        assert.isTrue(isList(first.getIn(['match'])));
        assert.equal(first.getIn(['match', 0]), '*.html');
        assert.equal(first.getIn(['match', 1]), '*.css');
    });
});
