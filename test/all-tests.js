import { Test } from '@nodutilus/test'
import { preparation } from './preparation.js'
import events from '@nodutilus-test/events'
import fs from '@nodutilus-test/fs'
import test from '@nodutilus-test/test'


class AllTests extends Test {

  static ['@nodutilus/events'] = events
  static ['@nodutilus/fs'] = fs
  static ['@nodutilus/test'] = test

  async preparation() {
    await preparation()
  }

}


Test.runOnCI(new AllTests())
