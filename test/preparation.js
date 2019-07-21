const { strict: assert } = require('assert')
const { Test } = require('@ndk/test')

const { equal } = assert


class MyTestName extends Test {

  constructor() {
    super()
    this.name = 'My Test'
  }

}

class allTests {

  ['Test => name in constructor']() {
    const mt = new MyTestName()

    equal(mt.name, 'My Test')
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
