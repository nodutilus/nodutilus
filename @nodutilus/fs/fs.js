/** @module @nodutilus/fs */

import { isAbsolute, posix } from 'path'
import { promises as fsPromises, constants as fsConstants } from 'fs'

const { dirname, join, relative } = posix
const { COPYFILE_EXCL } = fsConstants
const { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } = fsPromises


/** @type {import('@nodutilus/fs').WalkFunctionCommon} */
function walk(path, options = {}, walker) {
  const prefix = isAbsolute(path) ? '' : './'
  let { include, exclude } = options

  walker = (typeof options === 'function' ? options : walker) || options.walker
  include = __normalizeSearchingRegExp(include)
  exclude = __normalizeSearchingRegExp(exclude)

  // win32 to posix (https://github.com/nodejs/node/issues/12298)
  path = path.replaceAll('\\', '/')

  if (walker) {
    return (async () => {
      const __walker = __walk(path, { prefix, include, exclude })
      let next = await __walker.next()

      while (!next.done) {
        next = await __walker.next(await walker(...next.value))
      }
    })()
  } else {
    return __walk(path, { prefix, include, exclude })
  }
}


/** @type {import('@nodutilus/fs').NormalizeSearchingRegExp} */
function __normalizeSearchingRegExp(sRegExp) {
  if (sRegExp) {
    if (sRegExp instanceof Array) {
      sRegExp = sRegExp.map(item => item instanceof RegExp ? item : new RegExp(item))
    } else if (!(sRegExp instanceof RegExp)) {
      sRegExp = new RegExp(sRegExp)
    }

    return sRegExp
  }
}


/** @type {import('@nodutilus/fs').SearchPathByRegExp} */
function __searchPathByRegExp(sRegExp, path) {
  if (sRegExp instanceof RegExp) {
    return sRegExp.test(path)
  } else {
    for (const sRE of sRegExp) {
      if (sRE.test(path)) {
        return true
      }
    }
  }
}


/** @type {import('@nodutilus/fs').WalkGeneratorFunction} */
async function* __walk(path, options = {}) {
  const { prefix, include, exclude } = options
  const files = await readdir(path, { withFileTypes: true })

  for (const file of files) {
    const isDirectory = file.isDirectory()
    const postfix = isDirectory ? '/' : ''
    const filePath = prefix + join(path, file.name) + postfix
    const isInclude = !include || __searchPathByRegExp(include, filePath)
    const isExclude = exclude ? __searchPathByRegExp(exclude, filePath) : false

    if (isExclude) {
      continue
    }

    if (isDirectory) {
      const nested = isInclude ? yield [filePath, file] : true

      if (nested !== false) {
        yield* __walk(filePath, options)
      }
    } else {
      if (isInclude) {
        yield [filePath, file]
      }
    }
  }
}


/**
 * @typedef {SearchingOptions} CopyOptions Опции управления копированием файлов и каталогов
 * @property {boolean} [throwIfExists=false] Завершать копирование ошибкой если файл или каталог уже существует
 * @property {boolean} [removeNonExists=false] При копировании со слиянием каталогов
 *  удалять найденные в целевом каталоге, но несуществующие в источнике каталоги и файлы
 */
/**
 * Копирует файл или каталог со всем содержимым.
 * По умолчанию осуществляет слияние каталогов и перезапись файлов (управляется флагами).
 *
 * @param {string} src Каталог или файл источник
 * @param {string} dest Целевой каталог или файл
 * @param {CopyOptions} [options] Опции управления копированием файлов и каталогов
 * @returns {Promise<void>}
 */
async function copy(src, dest, options = {}) {
  const { throwIfExists } = options
  const srcStat = await stat(src)

  if (srcStat.isDirectory()) {
    await __copy(src, dest, options)
  } else {
    if (!throwIfExists) {
      await mkdir(dirname(dest), { recursive: true })
    }
    await copyFile(src, dest, throwIfExists ? COPYFILE_EXCL : 0)
  }
}


/**
 * Вспомогательная функция для рекурсивного обхода дерева каталогов при копировании
 *
 * @param {string} src Каталог источник
 * @param {string} dest Целевой каталог
 * @param {CopyOptions} [options] Опции управления копированием файлов и каталогов
 * @returns {Promise<void>}
 */
async function __copy(src, dest, options) {
  const { throwIfExists, removeNonExists, include, exclude } = options
  const mkdirOptions = { recursive: !throwIfExists }
  const existentPaths = removeNonExists ? [] : false

  await mkdir(dest, mkdirOptions)
  for await (const [path, dirent] of walk(src, { include, exclude })) {
    const destPath = join(dest, relative(src, path))

    if (existentPaths) {
      existentPaths.push(destPath)
    }
    if (dirent.isDirectory()) {
      await mkdir(destPath, mkdirOptions)
    } else {
      await mkdir(dirname(destPath), { recursive: true })
      await copyFile(path, destPath)
    }
  }
  if (existentPaths) {
    const walker = walk(dest)
    let next = await walker.next()

    while (!next.done) {
      const [path, dirent] = next.value

      if (!existentPaths.includes(path)) {
        await remove(path)
      }

      next = await walker.next(dirent.isDirectory() ? false : null)
    }
  }
}


/**
 * Удаление файла или каталога со всем содержимым
 *
 * @param {string} path Каталог или файл
 * @param {SearchingOptions} [options] Опции управления удалением файлов и каталогов
 * @returns {Promise<void>}
 */
async function remove(path, options = {}) {
  const { include, exclude } = options

  if (include || exclude) {
    await walk(path, { include, exclude }, async (path, dirent) => {
      await rm(path, { force: true, recursive: true })
      if (dirent.isDirectory()) {
        return false
      }
    })
  } else {
    await rm(path, { force: true, recursive: true })
  }
}


/**
 * Чтение файла в формате JSON
 *
 * @param {string} path Путь до файла
 * @param {object} [defaultValue] Значение по умолчанию, если файл не найден
 * @returns {Promise<object>} Распарсенный JOSN объект
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
 * Чтение файла в текстовом формате
 *
 * @param {string} path Путь до файла
 * @param {string} [defaultValue] Значение по умолчанию, если файл не найден
 * @returns {Promise<string>} Текст из файла
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
 * @typedef {WriteOptions} WriteJSONOptions Опции управления записью JSON файла
 * @property {number} [space=2] Количество пробелов для форматирования JSON или null
 */
/**
 * Запись файла в формате JSON
 *
 * @param {string} path Путь до файла
 * @param {object} data JOSN объект
 * @param {WriteJSONOptions} [options] Опции управления записью JSON файла
 * @returns {Promise<void>}
 */
async function writeJSON(path, data, { throwIfExists, space } = {}) {
  const jsonData = JSON.stringify(data, null, typeof space === 'undefined' ? 2 : space)

  await writeText(path, jsonData, { throwIfExists })
}


/**
 * @typedef WriteOptions Опции управления записью текстового файла
 * @property {boolean} [throwIfExists=false] Завершать запись файла ошибкой, если файл существует
 */
/**
 * Запись файла в текстовом формате
 *
 * @param {string} path Путь до файла
 * @param {string} data Текст
 * @param {WriteOptions} [options] Опции управления записью текстового файла
 * @returns {Promise<void>}
 */
async function writeText(path, data, { throwIfExists } = {}) {
  const recursive = !throwIfExists

  if (recursive) {
    await mkdir(dirname(path), { recursive })
  }

  await writeFile(path, data, {
    encoding: 'utf8',
    flag: recursive ? 'w' : 'wx'
  })
}


export {
  copy,
  readJSON,
  readText,
  remove,
  walk,
  writeJSON,
  writeText
}
