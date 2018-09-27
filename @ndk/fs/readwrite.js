/** @module @ndk/fs/readwrite */
'use strict';

const ndk_fs_promisify = require('./promisify');

module.exports.readjson = readjson;
module.exports.writejson = writejson;
module.exports.readtext = readtext;
module.exports.writetext = writetext;

/**
 * Читает JSON файл
 * См. {@link module:@ndk/fs/promisify.readFile}
 *
 * @function readjson
 * @param {string|Buffer|URL|integer} path Путь до файла
 * @param {Object} [options={}]
 * @param {Object} options.default Если файла нет, вернет options.default
 * @returns {Promise<Object, Error>}
 */
async function readjson(path, options = {}) {
  return ndk_fs_promisify.readFile(path, 'utf8').then(JSON.parse).catch(err => {
    if (err.code === 'ENOENT' && typeof options.default !== 'undefined') {
      return options.default;
    } else {
      throw err;
    }
  });
}

/**
 * Записывает JSON файл
 * См. {@link module:@ndk/fs/promisify.writeFile}
 *
 * @function writejson
 * @param {string|Buffer|integer} file Путь до файла или дескриптор файла
 * @param {Object} data Данные для записи
 * @param {Object} [options={}]
 * @param {function|Array} [options.replacer=null] См. JSON.stringify replacer
 * @param {string|integer} [options.space=2] См. JSON.stringify space
 * @returns {Promise<undefined>}
 */
async function writejson(file, data, options = { replacer: null, space: 2 }) {
  options.space = options.space || 2;
  data = JSON.stringify(data, options.replacer, options.space);
  return ndk_fs_promisify.writeFile(file, data, 'utf8');
}

/**
 * Читает текстовый файл
 * См. {@link module:@ndk/fs/promisify.readFile}
 *
 * @function readtext
 * @param {string|Buffer|URL|integer} path Путь до файла
 * @param {Object} [options={}]
 * @param {string} options.default Если файла нет, вернет options.default
 * @returns {Promise<string, Error>}
 */
async function readtext(path, options = {}) {
  return ndk_fs_promisify.readFile(path, 'utf8').catch(err => {
    if (err.code === 'ENOENT' && typeof options.default !== 'undefined') {
      return options.default;
    } else {
      throw err;
    }
  });
}

/**
 * Записывает текстовый файл
 * См. {@link module:@ndk/fs/promisify.writeFile}
 *
 * @function writetext
 * @param {string|Buffer|integer} file Путь до файла или дескриптор файла
 * @param {string} data Данные для записи
 * @returns {Promise<undefined>}
 */
async function writetext(file, data) {
  return ndk_fs_promisify.writeFile(file, data, 'utf8');
}
