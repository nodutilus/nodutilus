import { Test } from '@nodutilus/test'


class Example extends Test {

  success() {
    return true
  }

}


const test = new Example()

test.parent = new Example()


Test.runOnCI(test)
