'use strict'

const { readJSON } = require('../src/@ndk/fs')
const { readdir } = require('fs').promises


/**
 *
 * @param {string} optionsFile
 */
async function buildMultiPackage(optionsFile) {
  const options = await readJSON(optionsFile)
  const packageNames = await readdir(options.packages)
  const packages = await Promise.all(packageNames.map(async name => {
    const packageJSON = await readJSON(`${options.packages}/${name}/package.json`)

    return packageJSON
  }))
  const versions = await readJSON(options.versions, {})

  console.log('buildMultiPackage:', options, packages, versions)
}


(async () => {
  await buildMultiPackage(...process.argv.slice(2, 3))
})().catch(error => {
  console.error(error)
  process.exit(1)
})
