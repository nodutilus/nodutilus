'use strict';
const { createTest } = require('@ndk/test');
const { throws } = require('assert').strict;


const AllPackagesTests = createTest('All packages tests', {

  ['test: @ndk/all']: require('./@ndk/all'),
  ['test: @ndk/env']: require('./@ndk/env'),
  ['test: @ndk/fn']: require('./@ndk/fn'),
  ['test: @ndk/test']: require('./@ndk/test'),
  ['test: @ndk/type']: require('./@ndk/type')

});


/*
 * Для чистоты анализа времени, вызовем throws, т.к. он "лениво" инициирует модуль проверки,
 *  и нужно исключить время на его загрузку из 1-го вызова в тестах.
 */
throws(() => { throw new Error('lazy'); }, { message: 'lazy' });


module.exports = AllPackagesTests;
AllPackagesTests.runIsMainModule();
