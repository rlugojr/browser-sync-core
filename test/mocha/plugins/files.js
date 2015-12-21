'use strict';

const assert  = require('chai').assert;
const bs      = require('../../../');
const fromJS  = require('immutable').fromJS;
const List    = require('immutable').List;
const watcher = require('../../../lib/plugins/watcher');
const plugs   = require('../../../lib/plugins');
const startup = require('../../../lib/startup');
const opts    = require('../../../lib/incoming-options');

function process(obj) {
    return watcher.transformOptions(startup.process(opts.merge(obj), startup.pipeline));
}

describe('uses file-watcher plugin', function () {
    it('accepts zero file options', function () {
        const actual = process({});
        assert.deepEqual(actual.get('files').toJS(), []);
    });
    it('accepts array of objects', function () {

        const actual = process({
            files: [
                {match: '*.html'},
                {match: ['*.css', 'templates/*.jade']}
            ]
        });

        const first = actual.getIn(['files', 0]);
        assert.isTrue(List.isList(first.getIn(['match'])));
        assert.equal(first.getIn(['match', 0]), '*.html');
        const second = actual.getIn(['files', 1]);
        assert.isTrue(List.isList(second.getIn(['match'])));
        assert.equal(second.getIn(['match', 0]), '*.css');
        assert.equal(second.getIn(['match', 1]), 'templates/*.jade');
        assert.equal(second.getIn(['namespace']), 'core');
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
        assert.isTrue(List.isList(first.getIn(['match'])));
        assert.equal(first.getIn(['match', 0]), '*.html');
        assert.equal(second.getIn(['match', 0]), '*.css');
    });
    it('accepts single string', function () {

        const actual = process({
            files: '*.html'
        });

        const first  = actual.getIn(['files', 0]);
        assert.isTrue(List.isList(first.getIn(['match'])));
        assert.equal(first.getIn(['match', 0]), '*.html');
    });
    it('accepts single Object with match as string', function () {

        const actual = process({
            files: {
                match: '*.html'
            }
        });

        const first  = actual.getIn(['files', 0]);
        assert.isTrue(List.isList(first.getIn(['match'])));
        assert.equal(first.getIn(['match', 0]), '*.html');
    });
    it('accepts single Object with array of strings', function () {

        const actual = process({
            files: {
                match: ['*.html', '*.css']
            }
        });

        const first  = actual.getIn(['files', 0]);
        assert.isTrue(List.isList(first.getIn(['match'])));
        assert.equal(first.getIn(['match', 0]), '*.html');
        assert.equal(first.getIn(['match', 1]), '*.css');
    });
    it.only('accepts files options from plugins', function () {

        const actual = process({
            files: {
                match: ['*.html', '*.css']
            },
            plugins: [
                {
                    module: {},
                    options: {
                        files: '*.html'
                    }
                },
                {
                    module: {},
                    options: {
                        files: {
                            match: ['*.css', '*.jade']
                        }
                    }
                }
            ]
        });

        const first  = actual.getIn(['files', 0]);
        const plug1  = actual.getIn(['plugins', 0]);
        const plug2  = actual.getIn(['plugins', 1]);

        //console.log(
        assert.equal(first.getIn(['match', 0]),  '*.html');
        assert.equal(first.getIn(['match', 1]),  '*.css');
        assert.equal(first.getIn(['namespace']), 'core');

        const second = actual.getIn(['files', 1]);
        const third = actual.getIn(['files', 2]);
        assert.equal(second.getIn(['match', 0]),  '*.html');

        assert.equal(third.getIn(['match', 0]),  '*.css');
        assert.equal(third.getIn(['match', 1]),  '*.jade');
        assert.equal(second.get('namespace'), plug1.get('name'));
        assert.equal(third.get('namespace'), plug2.get('name'));
    });
});
