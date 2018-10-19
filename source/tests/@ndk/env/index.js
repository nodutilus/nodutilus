'use strict';

const { equal } = require('assert').strict;

const { Test } = require('@ndk/test');
const env = require('@ndk/env');


class NDKEnv extends Test {

  get name() {
    return '@ndk/env';
  }

  ['test: Empty']() {
    equal(1, 1);
  }


}


module.exports = NDKEnv;
NDKEnv.runIsMainModule();
