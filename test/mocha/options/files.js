'use strict';

var bs     = require('../../../');
var opts   = require('../../../lib/default-options');
var merge  = require('../utils').optmerge;
var files  = require('../../../lib/files');
var assert = require('chai').assert;

function process(conf) {
    return [merge(conf)].map(files.merge)[0];
}

describe.only('init with files option', function () {
    it('accepts files options', function () {
        var actual = process({
            files: [
                '*.css',
                {
                    match: '*.html',
                    fn: function () {},
                    options: {
                        name: 'kittie'
                    }
                }
            ]
        }).get('files').toJS();

        assert.equal(actual.length, 2);

        assert.equal(actual[0].namespace, 'core');
        assert.equal(actual[0].fn, undefined);
        assert.equal(actual[0].match, '*.css');

        assert.equal(actual[1].namespace, 'core');
        assert.isFunction(actual[1].fn);
        assert.equal(actual[1].match, '*.html');
    });
    it('accepts files in pluigns', function () {
        var actual = process({
            plugins: [
                {
                    module: {},
                    options: {
                        files: ['*.css']
                    }
                }
            ]
        }).get('files').toJS();

        console.log(actual);
    });
});