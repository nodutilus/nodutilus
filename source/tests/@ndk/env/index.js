'use strict';

const { createTest } = require('@ndk/test');


const TestEnv = createTest('@ndk/env', {

  ['test: @ndk/env/args']: require('./test_args')

});


module.exports = TestEnv;
TestEnv.runIsMainModule();
