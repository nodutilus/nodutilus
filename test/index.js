import { Application, symlinkModule } from '@nodutilus/ci-cd'

new Application(async () => {
  await symlinkModule('../../@nodutilus', '@nodutilus')
  await symlinkModule('../../@nodutilus', 'test')
  await symlinkModule('../@nodutilus-test', 'test')

  const all = await import('./all-tests.js')

  await (all.default || all).runTests()
}).redy()
