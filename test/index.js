import { Application, symlinkModule } from '@nodutilus/ci-cd'

new Application(async () => {
  await symlinkModule('../../@nodutilus', '@nodutilus')
  await symlinkModule('../../@nodutilus', 'test')
  await symlinkModule('../@nodutilus-test', 'test')

  const { Test } = await import('@nodutilus/test')
  const { AllTests } = await import('./all-tests.js')

  await Test.runOnCI(new AllTests())
}).redy()
