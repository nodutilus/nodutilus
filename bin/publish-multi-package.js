'use strict'

const { readJSON } = require('../src/@nodutilus/fs')
const { readdir } = require('fs').promises
const { execSync } = require('child_process')


class MultiPackageBuilder {

  /**
   * @name MultiPackageBuilder~BuilderConfig
   * @typedef BuilderConfig
   * @property {string} buildFolder
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
    this.folders = await readdir(this.config.buildFolder)
  }

  /**
   * @name MultiPackageBuilder#publish
   */
  async publish() {
    for (const filder of this.folders) {
      const path = `${this.config.buildFolder}/${filder}`
      const packageJSON = await readJSON(`${path}/package.json`)
      const newVersion = packageJSON.version
      let curVersion

      try {
        curVersion = execSync(`npm view ${packageJSON.name} version`, {
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'pipe']
        }).trim()
      } catch (error) {
        if (!(/npm ERR! code E404/).test(error.stderr)) {
          throw error
        }
      }

      if (newVersion && newVersion !== curVersion) {
        execSync(`npm publish ${path}`, {
          encoding: 'utf-8',
          stdio: ['inherit', 'inherit', 'inherit']
        })
      } else {
        console.log(`📦  ${packageJSON.name}@${curVersion}${newVersion ? '' : ' (ignore)'}`)
      }
    }
  }

}


/**
 * @param {string} configFile
 */
async function publishMultiPackage(configFile) {
  const builder = new MultiPackageBuilder()

  await builder.loadMetadata(configFile)
  await builder.publish()
}


(async () => {
  await publishMultiPackage(...process.argv.slice(2, 3))
})().catch(error => {
  console.error(error)
  process.exit(1)
})
