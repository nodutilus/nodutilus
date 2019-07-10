import { Application, linkNodeModule } from '@nd-toolkit/ci-cd'


new Application(async () => {
  await linkNodeModule('@ndk', 'test')
}).redy()
