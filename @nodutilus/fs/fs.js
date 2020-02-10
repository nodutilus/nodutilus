/** @module @nodutilus/fs */

import { dirname, join } from 'path'
import { promises as fsPromises, constants as fsConstants } from 'fs'

const { COPYFILE_EXCL } = fsConstants
const { copyFile, mkdir, readdir, readFile, rmdir, stat, writeFile } = fsPromises
/**
 * @typedef CONSTANTS
 * @property {number} COPY_EXCL
 * @property {number} COPY_RMNONEXISTENT
 * @property {number} SYMLINK_EXCL
 * @property {number} SYMLINK_RMNONEXISTENT
 * @property {number} WALK_FILEFIRST
 * @property {number} WRITE_EXCL
 */
/** @type {CONSTANTS} */
const constants = Object.create(null)
const COPY_EXCL = constants.COPY_EXCL = 0b0001
const COPY_RMNONEXISTENT = constants.COPY_RMNONEXISTENT = 0b0010
const WALK_FILEFIRST = constants.WALK_FILEFIRST = 0b0100
const WRITE_EXCL = constants.WRITE_EXCL = 0b1000


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
      if (flags & WALK_FILEFIRST) {
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
    const excl = flags & COPY_EXCL
    const fsFlags = excl ? COPYFILE_EXCL : 0

    if (!excl) {
      await mkdir(dirname(dest), { recursive: true })
    }
    await copyFile(src, dest, fsFlags)
  }
}


/**
 * @param {string} src
 * @param {string} dest
 * @param {number} flags
 * @returns {Promise<void>}
 */
async function __copy(src, dest, flags) {
  const mkdirOptions = { recursive: !(flags & COPY_EXCL) }
  const existentPaths = flags & COPY_RMNONEXISTENT ? [] : false

  await mkdir(dest, mkdirOptions)
  await __walk('.', {
    root: src,
    walker: async (path, dirent) => {
      const destPath = join(dest, path)

      if (existentPaths) {
        existentPaths.push(destPath)
      }
      if (dirent.isDirectory()) {
        await mkdir(destPath, mkdirOptions)
      } else {
        await copyFile(join(src, path), destPath)
      }
    }
  })
  if (existentPaths) {
    await __walk('.', {
      root: dest,
      walker: async path => {
        const destPath = join(dest, path)

        if (!existentPaths.includes(destPath)) {
          await remove(destPath)

          return false
        }
      }
    })
  }
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
 * @param {object} defaultValue
 * @returns {Promise<object>}
 */
async function readJSON(path, defaultValue) {
  const data = await readFile(path, 'utf8').then(JSON.parse).catch(error => {
    if (error.code === 'ENOENT' && typeof defaultValue !== 'undefined') {
      return defaultValue
    }
    throw error
  })

  return data
}


/**
 * @param {string} path
 * @param {string} defaultValue
 * @returns {Promise<string>}
 */
async function readText(path, defaultValue) {
  const data = await readFile(path, 'utf8').catch(error => {
    if (error.code === 'ENOENT' && typeof defaultValue !== 'undefined') {
      return defaultValue
    }
    throw error
  })

  return data
}


/**
 * @param {string} path
 * @param {object} data
 * @param {number} flags
 * @returns {Promise<void>}
 */
async function writeJSON(path, data, flags) {
  const jsonData = JSON.stringify(data, null, 2)

  await writeText(path, jsonData, flags)
}


/**
 * @param {string} path
 * @param {string} data
 * @param {number} flags
 * @returns {Promise<void>}
 */
async function writeText(path, data, flags) {
  const recursive = !(flags & WRITE_EXCL)

  if (recursive) {
    await mkdir(dirname(path), { recursive })
  }

  await writeFile(path, data, {
    encoding: 'utf8',
    flag: recursive ? 'w' : 'wx'
  })
}


export {
  constants,
  copy,
  readJSON,
  readText,
  remove,
  walk,
  writeJSON,
  writeText
}
