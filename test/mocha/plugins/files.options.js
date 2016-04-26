'use strict';

var assert    = require('chai').assert;
var Immutable = require('immutable');
var isList    = Immutable.List.isList;
var isMap     = Immutable.Map.isMap;
var watcher   = require('../../../dist/plugins/watch');
var startup   = require('../../../dist/startup');
var opts      = require('../../../dist/incoming-options');

function process(obj) {
    return watcher.transformOptions(startup.process(opts.merge(obj), startup.pipeline));
}

describe('uses file-watcher plugin with options', function () {
    it('accepts array of objects', function () {

        var actual = process({
            watch: [
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

        var first = actual.getIn(['watch', 0]);
        assert.isUndefined(first.getIn(['options', 'ignored']));

        var second = actual.getIn(['watch', 1]);
        assert.equal(second.getIn(['options', 'ignored']), '*.txt');
    });
    it('accepts array of strings', function () {

        var actual = process({
            watch: [
                '*.html',
                '*.css'
            ]
        });

        var first  = actual.getIn(['watch', 0]);
        var second = actual.getIn(['watch', 1]);
        assert.isTrue(isMap(first.get('options')));
        assert.isTrue(isMap(second.get('options')));
    });
    it('accepts single string', function () {

        var actual = process({
            watch: '*.html'
        });

        var first  = actual.getIn(['watch', 0]);
        assert.isTrue(isMap(first.get('options')));
    });
    it('accepts single Object with match as string', function () {

        var actual = process({
            watch: {
                match: '*.html',
                throttle: 1000,
                options: {
                    ignored: ['*.txt']
                }
            }
        });

        var first  = actual.getIn(['watch', 0]);
        assert.equal(first.get('throttle'), 1000);
        assert.equal(first.getIn(['options', 'ignored', 0]), '*.txt');
    });
    it('accepts single Object with array of strings', function () {

        var actual = process({
            watch: {
                match: ['*.html', '*.css']
            }
        });

        var first  = actual.getIn(['watch', 0]);
        assert.isTrue(isList(first.getIn(['match'])));
        assert.equal(first.getIn(['match', 0]), '*.html');
        assert.equal(first.getIn(['match', 1]), '*.css');
    });
    it('accepts locator regex', function () {
        var actual = process({
            watch: [
                {
                    match:   ['*.css'],
                    locator: /style\.([a-z]?)\.css/g
                }
            ]
        });

        var first = actual.getIn(['watch', 0]);
        assert.isTrue(first.getIn(['locator', 'global']));
        assert.isFalse(first.getIn(['locator', 'ignoreCase']));
        assert.isFalse(first.getIn(['locator', 'multiline']));
    });
});
