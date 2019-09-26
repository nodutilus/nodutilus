'use strict'

const { symlink } = require('../src/@ndk/fs')
const { basename } = require('path')

/**
 * @param {string} src
 * @param {string} dest
 */
async function linkNodeModule(src, dest = '.') {
  const destModulePath = `${dest}/node_modules/${basename(src)}`

  await symlink(src, destModulePath)
}


(async () => {
  let args = process.argv.slice(2)

  while (args.length) {
    await linkNodeModule(...args.slice(0, 2))
    args = args.slice(2)
  }
})().catch(error => {
  console.error(error)
  process.exit(1)
})
