'use strict'

const { readJSON, writeJSON, copy, constants: { COPY_RMNONEXISTENT } } = require('../src/@ndk/fs')
const { readdir } = require('fs').promises


/**
 *
 * @param {string} optionsFile
 */
async function buildMultiPackage(optionsFile) {
  const options = await readJSON(optionsFile)
  const packageDirs = await readdir(options.packages)
  const packagesSrc = await Promise.all(packageDirs.map(async name => {
    const packageJSON = await readJSON(`${options.packages}/${name}/package.json`)

    return [name, packageJSON]
  }))
  const versions = await readJSON(options.versions)
  const packageAliases = {}
  const packageNames = []
  const packages = {}

  await copy(options.packages, options.buildFolder, COPY_RMNONEXISTENT)
  for (const [name, pckg] of packagesSrc) {
    const packageJSON = Object.assign({}, options.template, pckg)
    const verInfo = versions[packageJSON.name]

    if (verInfo.version && verInfo.publish) {
      packageJSON.version = verInfo.version
    }
    packageAliases[packageJSON.name] = name
    packages[packageJSON.name] = packageJSON
    packageNames.push(packageJSON.name)
  }

  for (const name of packageNames) {
    const packageJSON = packages[name]
    const crossDependencies = options.crossDependencies[name]
    const dependencies = {}

    if (crossDependencies) {
      crossDependencies.forEach(crossName => {
        const crossVersion = packages[crossName].version

        if (!crossVersion) {
          throw new Error(`"${crossName}" - Not found`)
        }
        dependencies[crossName] = crossVersion
      })
    }

    if (Object.keys(dependencies).length > 0) {
      packageJSON.dependencies = dependencies
    }
  }

  for (const packageJSON of Object.values(packages)) {
    const alias = packageAliases[packageJSON.name]

    for (const prop in packageJSON) {
      if (packageJSON[prop] === null) {
        delete packageJSON[prop]
      }
    }
    await writeJSON(`${options.buildFolder}/${alias}/package.json`, packageJSON)
  }

  console.log('buildMultiPackage:', options, packagesSrc, versions)
}


(async () => {
  await buildMultiPackage(...process.argv.slice(2, 3))
})().catch(error => {
  console.error(error)
  process.exit(1)
})
