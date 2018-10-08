'use strict';

const __cache = {};
const __load = name => __cache[name] = require(name);


module.exports = {
  get cfg() {
    return __cache['@ndk/cfg'] || __load('@ndk/cfg');
  },
  get cli() {
    return __cache['@ndk/cli'] || __load('@ndk/cli');
  },
  get console() {
    return __cache['@ndk/console'] || __load('@ndk/console');
  },
  get dom() {
    return __cache['@ndk/dom'] || __load('@ndk/dom');
  },
  get env() {
    return __cache['@ndk/env'] || __load('@ndk/env');
  },
  get fn() {
    return __cache['@ndk/fn'] || __load('@ndk/fn');
  },
  get fs() {
    return __cache['@ndk/fs'] || __load('@ndk/fs');
  },
  get git() {
    return __cache['@ndk/git'] || __load('@ndk/git');
  },
  get log() {
    return __cache['@ndk/log'] || __load('@ndk/log');
  },
  get pg() {
    return __cache['@ndk/pg'] || __load('@ndk/pg');
  },
  get ps() {
    return __cache['@ndk/ps'] || __load('@ndk/ps');
  },
  get test() {
    return __cache['@ndk/test'] || __load('@ndk/test');
  },
  get type() {
    return __cache['@ndk/type'] || __load('@ndk/type');
  }
};
