'use strict';

var assert  = require('chai').assert;
var bs      = require('../../../');
var fromJS  = require('immutable').fromJS;
var List    = require('immutable').List;
var watcher = require('../../../dist/plugins/watch');
var plugs   = require('../../../dist/plugins');
var startup = require('../../../dist/startup');
var opts    = require('../../../dist/incoming-options');

function process(obj) {
    return watcher.transformOptions(startup.process(opts.merge(obj), startup.pipeline));
}

describe('uses file-watcher plugin', function () {
    it('accepts zero file options', function () {
        var actual = process({});
        assert.deepEqual(actual.get('watch').toJS(), []);
    });
    it('accepts array of objects', function () {

        var actual = process({
            watch: [
                {match: '*.html'},
                {match: ['*.css', 'templates/*.jade']}
            ]
        });

        var first = actual.getIn(['watch', 0]);
        assert.isTrue(List.isList(first.getIn(['match'])));
        assert.equal(first.getIn(['match', 0]), '*.html');
        var second = actual.getIn(['watch', 1]);
        assert.isTrue(List.isList(second.getIn(['match'])));
        assert.equal(second.getIn(['match', 0]), '*.css');
        assert.equal(second.getIn(['match', 1]), 'templates/*.jade');
        assert.equal(second.getIn(['namespace']), 'core');
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
        assert.isTrue(List.isList(first.getIn(['match'])));
        assert.equal(first.getIn(['match', 0]), '*.html');
        assert.equal(second.getIn(['match', 0]), '*.css');
    });
    it('accepts single string', function () {

        var actual = process({
            watch: '*.html'
        });

        var first  = actual.getIn(['watch', 0]);
        assert.isTrue(List.isList(first.getIn(['match'])));
        assert.equal(first.getIn(['match', 0]), '*.html');
    });
    it('accepts single Object with match as string', function () {

        var actual = process({
            watch: {
                match: '*.html'
            }
        });

        var first  = actual.getIn(['watch', 0]);
        assert.isTrue(List.isList(first.getIn(['match'])));
        assert.equal(first.getIn(['match', 0]), '*.html');
    });
    it('accepts single Object with array of strings', function () {

        var actual = process({
            watch: {
                match: ['*.html', '*.css']
            }
        });

        var first  = actual.getIn(['watch', 0]);
        assert.isTrue(List.isList(first.getIn(['match'])));
        assert.equal(first.getIn(['match', 0]), '*.html');
        assert.equal(first.getIn(['match', 1]), '*.css');
    });
    it('accepts files options from plugins', function () {

        var actual = process({
            watch: {
                match: ['*.html', '*.css']
            },
            plugins: [
                {
                    module: {},
                    options: {
                        watch: '*.html'
                    }
                },
                {
                    module: {},
                    options: {
                        watch: {
                            match: ['*.css', '*.jade']
                        }
                    }
                }
            ]
        });

        var first  = actual.getIn(['watch', 0]);
        var plugs  = actual.getIn(['plugins']).filter(function (x) {
            return !x.get('internal');
        });

        //console.log(
        assert.equal(first.getIn(['match', 0]),  '*.html');
        assert.equal(first.getIn(['match', 1]),  '*.css');
        assert.equal(first.getIn(['namespace']), 'core');

        var second = actual.getIn(['watch', 1]);
        var third = actual.getIn(['watch', 2]);
        assert.equal(second.getIn(['match', 0]),  '*.html');

        assert.equal(third.getIn(['match', 0]),  '*.css');
        assert.equal(third.getIn(['match', 1]),  '*.jade');
        assert.equal(second.get('namespace'), plugs.get(0).get('name'));
        assert.equal(third.get('namespace'), plugs.get(1).get('name'));
    });
});
