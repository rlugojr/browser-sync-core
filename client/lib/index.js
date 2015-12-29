"use strict";

var socket       = require("./socket");
var shims        = require("./client-shims");
var notify       = require("./notify");
var codeSync     = require("./code-sync");
var BrowserSync  = require("./browser-sync");
var ghostMode    = require("./ghostmode");
var emitter      = require("./emitter");
var events       = require("./events");
var utils        = require("./browser.utils");

var shouldReload = false;
var initialised    = false;

/**
 * @param options
 */
exports.init = function (options) {
    if (shouldReload && options.reloadOnRestart) {
        utils.reloadBrowser();
    }

    var BS = window.___browserSync___ || {};

    if (!BS.client) {

        BS.client = true;

        var browserSync = new BrowserSync(options);

        // Always init on page load
        ghostMode.init(browserSync);
        codeSync.init(browserSync);

        notify.init(browserSync);

        if (options.notify) {
            notify.flash("Connected to BrowserSync as " + browserSync.store.get('client.id'));
        }
    }

    if (!initialised) {
        socket.on("disconnect", function () {
            if (options.notify) {
                notify.flash("Disconnected from BrowserSync");
            }
            shouldReload = true;
        });
        initialised = true;
    }
};

/**
 * Handle individual socket connections
 */
socket.on("connection", exports.init);


