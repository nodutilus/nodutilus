import { mkdirSync, symlinkSync, existsSync } from 'fs'
import { resolve } from 'path'

console.log(process.cwd())
console.log(resolve('test/node_modules'))
console.log(resolve('@nodutilus'))
console.log(resolve('test/node_modules/@nodutilus'))
console.log(resolve('test/@nodutilus-test'))
console.log(resolve('test/node_modules/@nodutilus-test'))

mkdirSync(resolve('test/node_modules'), { recursive: true })
if (!existsSync(resolve('test/node_modules/@nodutilus'))) {
  symlinkSync('../../@nodutilus', resolve('test/node_modules/@nodutilus'), 'dir')
}
if (!existsSync(resolve('test/node_modules/@nodutilus-test'))) {
  symlinkSync('../@nodutilus-test', resolve('test/node_modules/@nodutilus-test'), 'dir')
}
