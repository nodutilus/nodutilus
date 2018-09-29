'use strict';
const { createTest } = require('@ndk/test');

const NDK_FN = createTest('@ndk/fn', {

  ['test: @ndk/fn/datetime']: require('./datetime')

});

module.exports = NDK_FN;
NDK_FN.runIsMainModule();
