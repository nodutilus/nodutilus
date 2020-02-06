import { Test } from '@nodutilus/test'
import { preparation } from './preparation.js'
import events from '@nodutilus-test/events'
import fs from '@nodutilus-test/fs'
import test from '@nodutilus-test/test'


class AllTests extends Test {

  [Test.afterEachDeep]({ path = [], name, result: { success, error } }) {
    const result = success ? 'success' : 'failure'

    console.log(`${result}: ${path.join(', ')} => ${name}`)
    if (error) {
      console.log(error)
    }
  }

  static ['@nodutilus/events'] = events
  static ['@nodutilus/fs'] = fs
  static ['@nodutilus/test'] = test

}


export async function runTests() {
  await preparation()

  return Test.run(new AllTests())
}
