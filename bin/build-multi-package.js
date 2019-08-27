'use strict'

const { resolve } = require('path')


/**
 *
 * @param {string} optionsFile
 */
async function buildMultiPackage(optionsFile) {
  const options = require(resolve(optionsFile))

  await console.log('buildMultiPackage:', options)
}


(async () => {
  await buildMultiPackage(...process.argv.slice(2, 3))
})().catch(console.error)
