import { Application, symlinkModule } from '@nodutilus/ci-cd'

new Application(async () => {
  await symlinkModule('../../@nodutilus', '@nodutilus')
  await symlinkModule('../../@nodutilus', 'test')
  await (await import('./@nodutilus/all.js')).runTests()
}).redy()
