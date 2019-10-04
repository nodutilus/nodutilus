'use strict'

const { readJSON, writeJSON, copy, constants: { COPY_RMNONEXISTENT } } = require('../src/@ndk/fs')
const { readdir } = require('fs').promises


/**
 * @class MultiPackageBuilder
 */
class MultiPackageBuilder {

  /**
   * @name MultiPackageBuilder~BuilderConfig
   * @typedef BuilderConfig
   * @property {string} packages
   * @property {string} versions
   * @property {PackageJSON} template
   */
  /**
   * @name MultiPackageBuilder~PackageJSON
   * @typedef PackageJSON
   * @property {string} name
   */
  /**
   * @name MultiPackageBuilder~Version
   * @typedef Version
   * @property {string} version
   */

  /**
   * @name MultiPackageBuilder#loadMetadata
   * @param {string} file
   */
  async loadMetadata(file) {
    /**
     * @name MultiPackageBuilder#config @type {BuilderConfig}
     */
    this.config = await readJSON(file)
    /**
     * @name MultiPackageBuilder#folders @type {Array<string>}
     */
    this.folders = await readdir(this.config.packages)
    /**
     * @name MultiPackageBuilder#packages @type {Map<string,PackageJSON>}
     */
    this.packages = new Map()
    for (const name of this.folders) {
      this.packages.set(name, await this.readPackageJSON(name))
    }
    /**
     * @name MultiPackageBuilder#versions @type {Object<string,Version>}
     */
    this.versions = await readJSON(this.config.versions)
  }

  /**
   * @name MultiPackageBuilder#readPackageJSON
   * @param {string} name
   * @returns {PackageJSON}
   */
  async readPackageJSON(name) {
    /** @type {PackageJSON} */
    const packageJSON = await readJSON(`${this.config.packages}/${name}/package.json`)

    return Object.assign({}, this.config.template, packageJSON)
  }

}


/**
 *
 * @param {string} configFile
 */
async function buildMultiPackage(configFile) {
  const builder = new MultiPackageBuilder()

  await builder.loadMetadata(configFile)


  const options = builder.config
  const packagesSrc = builder.packages
  const versions = builder.versions
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
