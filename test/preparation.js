import { strict as assert } from 'assert'
import { Test } from '@ndk/test'

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


export async function preparation() {
  const tests = new allTests()
  const testNames = Object.getOwnPropertyNames(tests.__proto__)
    .filter(item => item !== 'constructor')
  for (const testName of testNames) {
    await tests[testName]()
  }
}
