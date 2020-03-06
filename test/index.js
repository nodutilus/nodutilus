import { Application, symlinkModule } from '@nodutilus/ci-cd'

new Application(async () => {
  await symlinkModule('../../@nodutilus', '@nodutilus')
  await symlinkModule('../../@nodutilus', 'test')
  await symlinkModule('../@nodutilus-test', 'test')

  await import('./all-tests.js')
}).redy()
