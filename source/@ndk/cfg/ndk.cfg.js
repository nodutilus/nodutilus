/** @module @ndk/cfg */
'use strict';
const { join, resolve } = require('path');
const { appHome, appKwargs } = require('@ndk/env');

const runtimeConfig = {};
var fileConfig = {};
var appConfig = {};

Object.defineProperty(runtimeConfig, 'bindProperty', {
  configurable: false,
  enumerable: false,
  get: () => bindProperty
});

const ndk_cfg = module.exports = new Proxy(runtimeConfig, {
  get: handler_get
});

if (appHome) {
  try {
    appConfig = require(join(appHome, 'config'));
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') {
      throw error;
    }
  }
}

if ('configfile' in appKwargs) {
  fileConfig = require(resolve(appKwargs['configfile']));
}

function handler_get(target, name) {
  if (name in target) {
    return target[name];
  }
  if (name in appKwargs) {
    return (target[name] = appKwargs[name]);
  }
  if (name in fileConfig) {
    return (target[name] = fileConfig[name]);
  }
  if (name in process.env) {
    return (target[name] = process.env[name]);
  }
  if (name in appConfig) {
    return (target[name] = appConfig[name]);
  }
  return (target[name] = undefined);
}

function bindProperty(moduleObject, moduleName, propertyName) {
  const configName = `${moduleName}:${propertyName}`;
  return Object.defineProperty(moduleObject, propertyName, {
    configurable: false,
    enumerable: true,
    get: () => ndk_cfg[configName],
    set: value => runtimeConfig[configName] = value
  });
}
