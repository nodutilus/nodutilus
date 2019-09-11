/** @module @ndk/fs */
'use strict'

const { resolve } = require('path')


/**
 * @typedef {object} WalkOptions
 * @property {boolean} [topdown=true]
 */
/**
 * @callback Walker
 * @param {string} file
 * @param {import('fs').Stats} stat
 * @returns {boolean}
 */
/**
 * @param {string} path
 * @param {WalkOptions} [options]
 * @param {Walker} walker
 */
async function walk(path, options, walker) {
  if (typeof options === 'function') {
    walker = options
    options = { topdown: true }
  }
  path = resolve(path.replace(/\\/g, '/'))
  await __walk(path, '/', options, walker)
}


/**
 *
 * @param {string} root
 * @param {string} path
 * @param {WalkOptions} options
 * @param {Walker} walker
 */
async function __walk(root, path, options, walker) {

}


exports.walk = walk
