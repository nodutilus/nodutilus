/** @module @ndk/cfg */
'use strict';
const { join, /*resolve*/ } = require('path');
const { appHome, appKwargs } = require('@ndk/env/legacy');

const appConfigFile = appKwargs.configFile || join(appHome, 'config');

class Config {
  constructor(file) {
    this.file = file;
  }
}

exports.appConfig = new Config(appConfigFile);
