/** @module @ndk/fs */
'use strict'

const { dirname, join } = require('path')
const {
  promises: { copyFile, mkdir, readdir, readFile, rmdir, stat },
  constants: { COPYFILE_EXCL }
} = require('fs')

const WALK_FILE_FIRST = 0b1


/**
 * @callback Walker
 * @param {string} path
 * @param {import('fs').Dirent} dirent
 * @returns {boolean|Promise<boolean>}
 */
/**
 * @param {string} path
 * @param {number|Walker} [flags]
 * @param {Walker} [walker]
 * @returns {Promise<void>}
 */
async function walk(path, flags, walker) {
  if (typeof flags === 'function') {
    [flags, walker] = [walker, flags]
  }
  await __walk('.', { root: path, flags, walker })
}


/**
 * @typedef WalkOptions
 * @property {string} root
 * @property {number} [flags]
 * @property {Walker} walker
 */
/**
 * @param {string} path
 * @param {WalkOptions} options
 * @returns {Promise<void>}
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


/**
 * @param {string} src
 * @param {string} dest
 * @param {number} flags
 * @returns {Promise<void>}
 */
async function copy(src, dest, flags) {
  const srcStat = await stat(src)

  if (srcStat.isDirectory()) {
    await __copy(src, dest, flags)
  } else {
    if (!(flags & COPYFILE_EXCL)) {
      await mkdir(dirname(dest), { recursive: true })
    }
    await copyFile(src, dest, flags)
  }
}


/**
 * @param {string} src
 * @param {string} dest
 * @param {number} flags
 * @returns {Promise<void>}
 */
async function __copy(src, dest, flags) {
  const mkdirOptions = { recursive: !(flags & COPYFILE_EXCL) }

  await mkdir(dest, mkdirOptions)
  await __walk('.', {
    root: src,
    walker: async (path, dirent) => {
      if (dirent.isDirectory()) {
        await mkdir(join(dest, path), mkdirOptions)
      } else {
        await copyFile(join(src, path), join(dest, path), flags)
      }
    }
  })
}


/**
 * @param {string} path
 * @returns {Promise<void>}
 */
async function remove(path) {
  await rmdir(path, { recursive: true })
}


/**
 * @param {string} path
 * @param {string} defaultValue
 * @returns {Promise<string>}
 */
async function readText(path, defaultValue) {
  return await readFile(path, 'utf8').catch(error => {
    if (error.code === 'ENOENT' && typeof defaultValue !== 'undefined') {
      return defaultValue
    }
    throw error
  })
}


exports.copy = copy
exports.readText = readText
exports.remove = remove
exports.walk = walk
exports.WALK_FILE_FIRST = WALK_FILE_FIRST
