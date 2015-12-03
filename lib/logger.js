'use strict';

const messages   = require('./connect-utils');
const utils      = require('./utils');
const inFunction = require('./utils').isFunction;
const ucfirst    = require('./utils').ucfirst;

const template = '[{blue:%s}] ';

const logger   = require('eazy-logger').Logger({
    prefix: template.replace('%s', 'BS'),
    useLevelPrefixes: false
});

module.exports.logger = logger;

/**
 * @param name
 * @returns {*}
 */
module.exports.getLogger = function (name) {
    return logger.clone(function (config) {
        config.prefix = config.prefix + template.replace('%s', name);
        return config;
    });
};

/**
 * Plugin interface for BrowserSync
 * @param {Map} options
 * @returns {Object}
 */
module.exports.plugin = function (options) {

    const logPrefix = options.get('logPrefix');
    const logLevel  = options.get('logLevel');

    // Should set logger level here!
    logger.setLevel(logLevel);

    if (logPrefix) {
        if (isFunction(logPrefix)) {
            logger.setPrefix(logPrefix);
        } else {
            logger.setPrefix(template.replace('%s', logPrefix));
        }
    }

    return logger;
};

///**
// *
// * @param urls
// */
//function logUrls (urls) {
//
//    const keys = Object.keys(urls);
//    const longestName = 0;
//    const longesturl  = 0;
//    const offset      = 2;
//
//    if (!keys.length) {
//        return;
//    }
//
//    const names = keys.map(function (key) {
//        if (key.length > longestName) {
//            longestName = key.length;
//        }
//        if (urls[key].length > longesturl) {
//            longesturl = urls[key].length;
//        }
//        return key;
//    });
//
//    const underline  = getChars(longestName + offset + longesturl + 1, '-');
//    const underlined = false;
//
//    logger.info('{bold:Access URLs:');
//    logger.unprefixed('info', '{grey: %s', underline);
//
//    keys.forEach(function (key, i) {
//        const keyname = getKeyName(key);
//        logger.unprefixed('info', ' %s: {magenta:%s}',
//            getPadding(key.length, longestName + offset) + keyname,
//            urls[key]
//        );
//        if (!underlined && names[i + 1] && names[i + 1].indexOf('ui') > -1) {
//            underlined = true;
//            logger.unprefixed('info', '{grey: %s}', underline);
//        }
//    });
//
//    logger.unprefixed('info', '{grey: %s}', underline);
//}
//
///**
// * @param {Number} len
// * @param {Number} max
// * @returns {string}
// */
//function getPadding (len, max) {
//    return new Array(max - (len + 1)).join(' ');
//}
//
///**
// * @param {Number} len
// * @param {String} char
// * @returns {string}
// */
//function getChars (len, char) {
//    return new Array(len).join(char);
//}
//
///**
// * Transform url-key names into something more presentable
// * @param key
// * @returns {string}
// */
//function getKeyName(key) {
//    if (key.indexOf('ui') > -1) {
//        if (key === 'ui') {
//            return 'UI';
//        }
//        if (key === 'ui-external') {
//            return 'UI External';
//        }
//    }
//    return ucfirst(key);
//}
//
///**
// * Determine if file changes should be logged
// * @param bs
// * @param data
// * @returns {boolean}
// */
//function canLogFileChange(bs, data) {
//    if (data && data.log === false) {
//        return false;
//    }
//
//    return bs.options.get('logFileChanges');
//}
