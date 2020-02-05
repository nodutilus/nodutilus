import { Test } from '@nodutilus/test'


class AllTests extends Test {

  [Test.afterEachDeep]({ path = [], name, result: { success, error } }) {
    const result = success ? 'success' : 'failure'

    console.log(`${result}: ${path.join(', ')} => ${name}`)
    if (error) {
      console.log(error)
    }
  }

}


export async function runTests() {
  AllTests['@nodutilus/events'] = await import('./events')
  AllTests['@nodutilus/test'] = await import('./test')
  //   require('./@nodutilus/fs'),

  return Test.run(new AllTests())
}
