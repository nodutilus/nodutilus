const { strict: assert } = require('assert')
const { Test } = require('@ndk/test')

const { equal, deepEqual } = assert


class MyTestName extends Test {

  constructor() {
    super()
    this.name = 'My Test'
    this.inConstructor = () => {}
  }

  baseTest() {}

}


class MyTestNameExt extends MyTestName {

  baseTestExt() {}

}


class allTests {

  ['Test => name in constructor']() {
    const mt = new MyTestName()
    const mte = new MyTestNameExt()

    equal(mt.name, 'My Test')
    equal(mte.name, 'My Test')
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
