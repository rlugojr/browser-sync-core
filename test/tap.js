var tap = require('tap');
var request = require('supertest');

// convenience
if (module === require.main) {
    tap.pass('ok');
    return;
}

/**
 * Custom 'hasClientJs' assertion for
 * asserting that a given string contains the client-side js
 */
tap.Test.prototype.addAssert('hasClientJs', 1, function (string, message, extra) {
    message = message || 'Should contain client JS';
    var tc = string.indexOf('Connected to BrowserSync') > -1;
    return this.true(tc, message, extra);
});

/**
 * Custom 'hasClientJs' assertion for
 * asserting that a given string contains the client-side js
 */
tap.Test.prototype.addAssert('hasSnippet', 1, function (bs, text, message, extra) {
    message = message || 'Snippet should exist in response body';
    var tc = text.indexOf(bs.options.get('snippet')) > -1;
    return this.true(tc, message, extra);
});

module.exports = tap;
