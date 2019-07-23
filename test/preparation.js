const { strict: assert } = require('assert')
const { Test } = require('@ndk/test')

const { equal, deepEqual } = assert


class MyTestName extends Test {

  constructor() {
    super()
    this.inConstructor = () => {}
  }

  baseTest() {}

}


class MyTestNameExt extends MyTestName {

  baseTestExt() {}

}


class MyTestNameInc extends Test {

  constructor() {
    super()
    this.include = new MyTestName()
    this.notInclude1 = MyTestName
  }

  get notInclude2() {
    return MyTestName
  }

  get notInclude3() {
    return new MyTestName()
  }

}


class allTests {

  ['Test => name in constructor']() {
    const mt = new MyTestName()
    const mte = new MyTestNameExt()

    equal(mt.name, 'MyTestName')
    equal(mte.name, 'MyTestNameExt')
  }

  ['Test => _getTests']() {
    const mt = new MyTestName()
    const tests = mt._getTests()

    deepEqual(tests, new Set(['inConstructor', 'baseTest']))
  }

  ['Test => _getTests | extends']() {
    const mt = new MyTestNameExt()
    const tests = mt._getTests()

    deepEqual(tests, new Set(['inConstructor', 'baseTest', 'baseTestExt']))
  }

  ['Test => _getTests | include']() {
    const mt = new MyTestNameInc()
    const tests = mt._getTests()

    deepEqual(tests, new Set(['include']))
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
