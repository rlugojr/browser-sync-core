# Browsersync core [![Build Status](https://travis-ci.org/BrowserSync/browser-sync-core.svg?branch=master)](https://travis-ci.org/BrowserSync/browser-sync-core)

> the engine that powers Browsersync - can be used standalone

## Install

```shell
npm i browser-sync-core -D
```

## Usage 

`bs.js`

```shell
const bs = require('browser-sync-core');
bs.create({
	serveStatic: ['./app']
	files: ['./app']
});
```

`package.json`

```shell
{
  "name": "your-project",
  "scripts": {
  	"start": "node bs"
  },
  "devDependencies": {
    "browser-sync-core": "0.0.2",
  },
  "dependencies": {}
}
```