'use strict'

const { strict: assert } = require('assert')
const { Test } = require('@ndk/test')

const { ok, equal, deepEqual, doesNotThrow } = assert


class MyTestName extends Test {

  baseTest() {}

  static notTest1() {}

  get notTest2() {
    return () => {}
  }

  get notTest3() {
    return new class Mtest extends Test {}()
  }

}


class MyTestConstructor extends Test {

  constructor() {
    super()
    this.myTest = () => {}
    this.notTest = MyTestName
    this.mySubTest = new MyTestName()
  }

}


class MyTestNameInclude extends Test {}


MyTestNameInclude.include = MyTestName
MyTestNameInclude.notTest = new MyTestName()


class MyTestNameExt extends MyTestName {

  baseTestExt() {}

}


class MyTestConstructorExt extends MyTestConstructor {

  constructor() {
    super()
    this.myTest2 = () => {}
  }

}


class MyTestNameIncludeExt extends MyTestNameInclude {}


MyTestNameIncludeExt.includeExt = MyTestName


class allTests {

  ['Test => getClassMethods']() {
    const mt = new MyTestName()
    const { tests } = mt

    deepEqual(Array.from(tests), ['baseTest'])
    doesNotThrow(mt.baseTest)
    doesNotThrow(MyTestName.notTest1)
    doesNotThrow(mt.notTest2)
    ok(mt.notTest3 instanceof Test)
  }

  ['Test => getClassMethods extends']() {
    const mt = new MyTestNameExt()
    const { tests } = mt

    deepEqual(Array.from(tests), ['baseTestExt', 'baseTest'])
    doesNotThrow(mt.baseTestExt)
  }

  ['Test => getInstanceTests']() {
    const mt = new MyTestConstructor()
    const { tests } = mt

    deepEqual(Array.from(tests), ['myTest', 'mySubTest'])
    doesNotThrow(mt.myTest)
    ok(mt.mySubTest instanceof Test)
    doesNotThrow(() => ok(new mt.notTest() instanceof Test))
  }

  ['Test => getInstanceTests extends']() {
    const mt = new MyTestConstructorExt()
    const { tests } = mt

    deepEqual(Array.from(tests), ['myTest', 'mySubTest', 'myTest2'])
    doesNotThrow(mt.myTest)
    doesNotThrow(mt.myTest2)
    ok(mt.mySubTest instanceof Test)
    doesNotThrow(() => ok(new mt.notTest() instanceof Test))
  }

  ['Test => getNestedStaticTests']() {
    const mt = new MyTestNameInclude()
    const { tests } = mt

    deepEqual(Array.from(tests), ['include'])
    doesNotThrow(() => ok(new MyTestNameInclude.include() instanceof Test))
    ok(MyTestNameInclude.notTest instanceof Test)
  }

  ['Test => getNestedStaticTests extends']() {
    const mt = new MyTestNameIncludeExt()
    const { tests } = mt

    deepEqual(Array.from(tests), ['includeExt', 'include'])
    doesNotThrow(() => ok(new MyTestNameIncludeExt.includeExt() instanceof Test))
    doesNotThrow(() => ok(new MyTestNameIncludeExt.include() instanceof Test))
    ok(MyTestNameIncludeExt.notTest instanceof Test)
  }

}


async function preparation() {
  const tests = new allTests()
  const testNames = Object.getOwnPropertyNames(tests.__proto__)
    .filter(item => item !== 'constructor')

  for (const testName of testNames) {
    await tests[testName]()
  }
}


Object.assign(exports, {
  preparation
})
