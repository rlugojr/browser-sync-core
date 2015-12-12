'use strict';

var assert  = require('chai').assert;
var bs      = require('../../../');
var fromJS  = require('immutable').fromJS;
var List    = require('immutable').List;
var watcher = require('../../../lib/plugins/watcher');

describe('uses file-watcher plugin', function () {
    it('accepts zero file options', function () {

        var actual = watcher.transformOptions(fromJS({}));
        assert.deepEqual(actual.get('files'), undefined);
    });
    it('accepts array of objects', function () {

        var actual = watcher.transformOptions(fromJS({
            files: [
                {match: '*.html'},
                {match: '*.css'}
            ]
        }));

        const first = actual.getIn(['files', 0]);
        assert.isTrue(List.isList(first.getIn(['match'])));
        assert.equal(first.getIn(['match', 0]), '*.html');
        const second = actual.getIn(['files', 1]);
        assert.isTrue(List.isList(second.getIn(['match'])));
        assert.equal(second.getIn(['match', 0]), '*.css');
        assert.equal(second.getIn(['namespace']), 'core');
    });
    it('accepts array of strings', function () {

        var actual = watcher.transformOptions(fromJS({
            files: [
                '*.html'
            ]
        }));

        const first = actual.getIn(['files', 0]);
        assert.isTrue(List.isList(first.getIn(['match'])));
        assert.equal(first.getIn(['match', 0]), '*.html');
    });
});
