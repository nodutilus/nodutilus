'use strict'

const { readJSON, writeJSON, copy, constants: { COPY_RMNONEXISTENT } } = require('../src/@ndk/fs')
const { readdir } = require('fs').promises

/**
 * @typedef PackageSource
 * @property {string} name
 * @property {string} version
 * @property {string} homepage
 * @property {string} description
 * @property {Array.<string>} keywords
 * @property {string} repository
 * @property {string} license
 * @property {string} main
 * @property {Object.<string, string>} dependencies
 */
/**
 * @class PackageJSON
 */
class PackageJSON {

  /**
   * @param {PackageSource} source
   */
  constructor(source) {
    /** @name PackageJSON#name @type {string} */
    this.name = null
    /** @name PackageJSON#version @type {string} */
    this.version = null
    /** @name PackageJSON#homepage @type {string} */
    this.homepage = null
    /** @name PackageJSON#description @type {string} */
    this.description = null
    /** @name PackageJSON#keywords @type {Array.<string>} */
    this.keywords = null
    /** @name PackageJSON#repository @type {string} */
    this.repository = null
    /** @name PackageJSON#license @type {string} */
    this.license = null
    /** @name PackageJSON#main @type {string} */
    this.main = null
    /** @name PackageJSON#dependencies @type {Object.<string, string>} */
    this.dependencies = {}
    Object.assign(this, source)
  }

  /**
   * @name PackageJSON#toJSON
   * @returns {PackageSource}
   */
  toJSON() {
    const json = {}

    for (const prop in this) {
      if (this[prop] !== null) {
        switch (prop) {
          case 'dependencies':
            if (Object.keys(this[prop]).length > 0) {
              json[prop] = this[prop]
            }
            break
          default:
            json[prop] = this[prop]
            break
        }
      }
    }

    return json
  }

}

/**
 * @class MultiPackageBuilder
 */
class MultiPackageBuilder {

  /**
   * @name MultiPackageBuilder~BuilderConfig
   * @typedef BuilderConfig
   * @property {string} packages
   * @property {string} versions
   * @property {string} crossDependencies
   * @property {string} licenseFile
   * @property {string} buildFolder
   * @property {PackageJSON} template
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
     * @name MultiPackageBuilder#folders @type {Array.<string>}
     */
    this.folders = await readdir(this.config.packages)
    /**
     * @name MultiPackageBuilder#packages @type {Map.<string,PackageSource>}
     */
    this.packages = new Map()
    for (const folder of this.folders) {
      this.packages.set(folder, await this.readPackageJSON(folder))
    }
    /**
     * @name MultiPackageBuilder#versions @type {Object.<string,Version>}
     */
    this.versions = await readJSON(this.config.versions)

    /**
     * @name MultiPackageBuilder#crossDependencies @type {Object.<string,Array<string>>}
     */
    this.crossDependencies = await readJSON(this.config.crossDependencies)
  }

  /**
   * @name MultiPackageBuilder#readPackageJSON
   * @param {string} name
   * @returns {PackageSource}
   */
  async readPackageJSON(name) {
    /** @type {PackageSource} */
    const packageJSON = await readJSON(`${this.config.packages}/${name}/package.json`)

    return Object.assign({}, this.config.template, packageJSON)
  }

  /**
   * @name MultiPackageBuilder#build
   */
  async build() {
    await copy(this.config.packages, this.config.buildFolder, COPY_RMNONEXISTENT)
    for (const folder of this.folders) {
      const packageJSON = this.getPackageJSON(folder)

      await writeJSON(`${this.config.buildFolder}/${folder}/package.json`, packageJSON)
      await copy(this.config.licenseFile, `${this.config.buildFolder}/${folder}/LICENSE`)
    }
  }

  /**
   * @name MultiPackageBuilder#getPackageJSON
   * @param {string} folder
   * @returns {PackageJSON}
   */
  getPackageJSON(folder) {
    const packageJSON = new PackageJSON(this.packages.get(folder))
    const { name, dependencies } = packageJSON
    const crossDependencies = this.crossDependencies[name]

    packageJSON.version = this.versions[name].version

    if (crossDependencies) {
      for (const crossDependencie of crossDependencies) {
        dependencies[crossDependencie] = this.versions[crossDependencie].version
      }
    }

    return packageJSON
  }

}


/**
 *
 * @param {string} configFile
 */
async function buildMultiPackage(configFile) {
  const builder = new MultiPackageBuilder()

  await builder.loadMetadata(configFile)
  await builder.build()

  console.log('buildMultiPackage:', builder)
}


(async () => {
  await buildMultiPackage(...process.argv.slice(2, 3))
})().catch(error => {
  console.error(error)
  process.exit(1)
})
