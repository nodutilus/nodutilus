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
  await __walk(path, '.', flags, walker)
}


/**
 * @param {string} root
 * @param {string} path
 * @param {number} flags
 * @param {Walker} walker
 */
async function __walk(root, path, flags, walker) {
  const files = await readdir(join(root, path), { withFileTypes: true })

  for (const file of files) {
    const filePath = join(path, file.name)

    if (file.isDirectory()) {
      if ((flags & WALK_FILE_FIRST)) {
        await __walk(root, filePath, flags, walker)
        await walker(filePath, file)
      } else {
        const needNested = await walker(filePath, file)

        if (needNested !== false) {
          await __walk(root, filePath, flags, walker)
        }
      }
    } else {
      await walker(filePath, file)
    }
  }
}


exports.walk = walk
exports.WALK_FILE_FIRST = WALK_FILE_FIRST
