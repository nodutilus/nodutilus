'use strict';

const { Test } = require('@ndk/test');


class SubMyTest extends Test {

  constructor() {
    super();
    throw new Error('Test Fail');
  }

  testIgnored() {}

}


class MyTest extends Test {

  get testSubMyTest() {
    return SubMyTest;
  }

}


module.exports = MyTest;
MyTest.runIsMainModule();
