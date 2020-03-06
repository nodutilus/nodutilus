import { Test } from '@nodutilus/test'


class Example extends Test {

  [Test.afterEach]() {
    throw new Error('afterEach')
  }

  success() {
    return true
  }

}


Test.runOnCI(new Example())
