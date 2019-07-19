import { strict as assert } from 'assert'
import { Test } from '@ndk/test'

const { equal } = assert

class MyTestName extends Test {

  constructor() {
    super()
    this.name = 'My Test'
  }

}

const allTests = {

  ['Test => name']() {
    const mt = new MyTestName()

    equal(mt.name, 'My Test')
  }

}

export function preparation() {
  Object.values(allTests).forEach(fn => fn())
}
