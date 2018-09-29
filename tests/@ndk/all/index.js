'use strict';

const all = require('@ndk/all');
const { Test } = require('@ndk/test');
const { equal } = require('assert').strict;


class NDK extends Test {

  get name() {
    return '@ndk/all';
  }

  ['test: Load All Modules']() {
    for (const moduleName in all) {
      const loadedModule = require('@ndk/' + moduleName);
      equal(all[moduleName], loadedModule, `Модуль '${moduleName}' не загрузился`);
    }
  }

}


module.exports = NDK;
NDK.runIsMainModule();
