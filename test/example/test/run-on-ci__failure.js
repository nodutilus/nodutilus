import { Test } from '@nodutilus/test'


class Example extends Test {

  failure() {
    throw new Error('Example failure')
  }

}


const test = new Example()

test.parent = new Example()


Test.runOnCI(test)
