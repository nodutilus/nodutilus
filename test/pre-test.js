import { mkdirSync, symlinkSync, existsSync } from 'fs'

mkdirSync('test/node_modules', { recursive: true })
if (!existsSync('test/node_modules/@nodutilus')) {
  symlinkSync('../../@nodutilus', 'test/node_modules/@nodutilus', 'dir')
}
if (!existsSync('test/node_modules/@nodutilus-test')) {
  symlinkSync('../@nodutilus-test', 'test/node_modules/@nodutilus-test', 'dir')
}
