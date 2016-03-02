'use strict';

const assert  = require('chai').assert;
const bs      = require('../../../');
const fromJS  = require('immutable').fromJS;
const List    = require('immutable').List;
const watcher = require('../../../dist/plugins/watch');
const plugs   = require('../../../dist/plugins');
const startup = require('../../../dist/startup');
const opts    = require('../../../dist/incoming-options');

function process(obj) {
    return watcher.transformOptions(startup.process(opts.merge(obj), startup.pipeline));
}

describe('uses file-watcher plugin', function () {
    it('accepts zero file options', function () {
        const actual = process({});
        assert.deepEqual(actual.get('watch').toJS(), []);
    });
    it('accepts array of objects', function () {

        const actual = process({
            watch: [
                {match: '*.html'},
                {match: ['*.css', 'templates/*.jade']}
            ]
        });

        const first = actual.getIn(['watch', 0]);
        assert.isTrue(List.isList(first.getIn(['match'])));
        assert.equal(first.getIn(['match', 0]), '*.html');
        const second = actual.getIn(['watch', 1]);
        assert.isTrue(List.isList(second.getIn(['match'])));
        assert.equal(second.getIn(['match', 0]), '*.css');
        assert.equal(second.getIn(['match', 1]), 'templates/*.jade');
        assert.equal(second.getIn(['namespace']), 'core');
    });
    it('accepts array of strings', function () {

        const actual = process({
            watch: [
                '*.html',
                '*.css'
            ]
        });

        const first  = actual.getIn(['watch', 0]);
        const second = actual.getIn(['watch', 1]);
        assert.isTrue(List.isList(first.getIn(['match'])));
        assert.equal(first.getIn(['match', 0]), '*.html');
        assert.equal(second.getIn(['match', 0]), '*.css');
    });
    it('accepts single string', function () {

        const actual = process({
            watch: '*.html'
        });

        const first  = actual.getIn(['watch', 0]);
        assert.isTrue(List.isList(first.getIn(['match'])));
        assert.equal(first.getIn(['match', 0]), '*.html');
    });
    it('accepts single Object with match as string', function () {

        const actual = process({
            watch: {
                match: '*.html'
            }
        });

        const first  = actual.getIn(['watch', 0]);
        assert.isTrue(List.isList(first.getIn(['match'])));
        assert.equal(first.getIn(['match', 0]), '*.html');
    });
    it('accepts single Object with array of strings', function () {

        const actual = process({
            watch: {
                match: ['*.html', '*.css']
            }
        });

        const first  = actual.getIn(['watch', 0]);
        assert.isTrue(List.isList(first.getIn(['match'])));
        assert.equal(first.getIn(['match', 0]), '*.html');
        assert.equal(first.getIn(['match', 1]), '*.css');
    });
    it('accepts files options from plugins', function () {

        const actual = process({
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

        const first  = actual.getIn(['watch', 0]);
        const plug1  = actual.getIn(['plugins', 0]);
        const plug2  = actual.getIn(['plugins', 1]);

        //console.log(
        assert.equal(first.getIn(['match', 0]),  '*.html');
        assert.equal(first.getIn(['match', 1]),  '*.css');
        assert.equal(first.getIn(['namespace']), 'core');

        const second = actual.getIn(['watch', 1]);
        const third = actual.getIn(['watch', 2]);
        assert.equal(second.getIn(['match', 0]),  '*.html');

        assert.equal(third.getIn(['match', 0]),  '*.css');
        assert.equal(third.getIn(['match', 1]),  '*.jade');
        assert.equal(second.get('namespace'), plug1.get('name'));
        assert.equal(third.get('namespace'), plug2.get('name'));
    });
});
