/** @module @ndk/fs */
'use strict'

const { join } = require('path')
const { readdir } = require('fs').promises

const WALK_FILE_FIRST = 0b1


/**
 * @callback Walker
 * @param {string} path
 * @param {import('fs').Dirent} dirent
 * @returns {boolean}
 */
/**
 * @param {string} path
 * @param {number|Walker} [flags]
 * @param {Walker} [walker]
 */
async function walk(path, flags, walker) {
  if (typeof flags === 'function') {
    [flags, walker] = [walker, flags]
  }
  await __walk('.', { root: path, flags, walker })
}


/**
 * @typedef WalkOptions
 * @property {string} options.root
 * @property {number} options.flags
 * @property {Walker} options.walker
 */
/**
 * @param {string} path
 * @param {WalkOptions} options
 */
async function __walk(path, options) {
  const { root, flags, walker } = options
  const files = await readdir(join(root, path), { withFileTypes: true })

  for (const file of files) {
    const filePath = join(path, file.name)

    if (file.isDirectory()) {
      if ((flags & WALK_FILE_FIRST)) {
        await __walk(filePath, options)
        await walker(filePath, file)
      } else {
        const needNested = await walker(filePath, file)

        if (needNested !== false) {
          await __walk(filePath, options)
        }
      }
    } else {
      await walker(filePath, file)
    }
  }
}


exports.walk = walk
exports.WALK_FILE_FIRST = WALK_FILE_FIRST
