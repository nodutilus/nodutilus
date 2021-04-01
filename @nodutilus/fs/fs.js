/** @module @nodutilus/fs */

import { dirname, join, relative } from 'path/posix'
import { promises as fsPromises, constants as fsConstants } from 'fs'

const { COPYFILE_EXCL } = fsConstants
const { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } = fsPromises


/**
 * @callback Walker Функция обратного вызова для обработки результатов обхода дерева каталога
 * @param {string} path Путь до найденного каталога или файла,
 *  включая каталог (path) переданный в вызов функции walk в формате posix.
 * @param {import('fs').Dirent} dirent Сущность записи каталога
 * @returns {void|boolean|Promise<void|boolean>} Если вернуть для каталога false,
 *  он будет проигнорирован (не работает с опцией fileFirst)
 */
/**
 * @typedef {Array<RegExp|string>|RegExp|string} SearchingRegExp Регулярное выражение или набор выражений,
 *  используемое для поиска совпадений в пути до каталога или файла.
 * Переданные сроки будут преобразованы через конструктор new RegExp(<string>).
 * В качестве разделителя пути необходимо использовать '/'
 * @example
 *  // Варианты для поиска файлов расширением `.log` c числовым именем в каталоге `home`
 *  ['/home/.+\\d+.log$', String.raw`/home/.+\d+.log$`, /\/home\/.+\d+.log$/]
 */
/**
 * @typedef WalkOptions Опции управления обходом дерева каталога
 * @property {boolean} [fileFirst=false] При обходе каталога сначала возвращать вложенные файлы затем каталоги
 * @property {SearchingRegExp} [include] Регулярное выражение (или набор выражений) для поиска совпадений пути при обходе.
 *  Позволит вернуть в выдачу результатов только соответствующие условиям каталоги и файлы.
 *  При этом обход дерева все равно выполняется для всех подкаталогов и файлов, но возвращаются только соответствующие условиям поиска.
 *  Для проверки используется путь от каталога (path), переданного в вызов функции walk, до конечного каталога или файла в формате posix.
 * @property {SearchingRegExp} [exclude] Регулярное выражение (или набор выражений) для исключения из обхода совпадающего пути.
 *  Позволит исключить из обхода дерева и выдачи результатов каталоги и файлы соответствующие условиям.
 *  Если часть пути совпадает с условиями, то все вложенные каталоги и файлы будут проигнорированы при обходе дерева.
 *  Для проверки используется путь от каталога (path), переданного в вызов функции walk, до конечного каталога или файла в формате posix.
 * @property {Walker} [walker] Обработчик результатов обхода дерева каталога
 */
/**
 * Обходит дерево каталога и возвращает вложенные каталоги и файлы в Walker
 *
 * @param {string} path Каталог для обхода
 * @param {WalkOptions} [options] Опции управления обходом дерева каталога
 * @param {Walker} [walker] Обработчик результатов обхода дерева каталога
 * @returns {Promise<void>|Iterator<[string,import('fs').Dirent]>} Если не передан Walker,
 *  то вернется итератор для обхода каталогов и файлов
 */
function walk(path, options = {}, walker) {
  const { fileFirst } = options
  let { include, exclude } = options

  walker = (typeof options === 'function' ? options : walker) || options.walker
  include = __normalizeSearchingRegExp(include)
  exclude = __normalizeSearchingRegExp(exclude)

  // win32 to posix (https://github.com/nodejs/node/issues/12298)
  path = path.replaceAll('\\', '/')

  if (walker) {
    return (async () => {
      const walk = __walk(path, { fileFirst, include, exclude })
      let next = await walk.next()

      while (!next.done) {
        next = await walk.next(await walker(...next.value))
      }
    })()
  } else {
    return __walk(path, { fileFirst, include, exclude })
  }
}


/**
 * @param {SearchingRegExp} sRegExp Исходное регулярное выражение или набор выражений
 * @returns {SearchingRegExp|void} Нормализованное регулярное выражение или набор выражений
 */
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


/**
 * @param {SearchingRegExp} sRegExp Регулярное выражение или набор выражений для сопоставления
 * @param {string} path Путь до каталога или файла для проверки соответствия условиям отбора
 * @returns {boolean} true - если хотя бы одно из выражений поиска совпадает с путем
 */
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


/**
 * @typedef WalkContext Внутренние опции для обхода дерева каталога
 * @property {boolean} [fileFirst=false] При обходе каталога сначала возвращать вложенные файлы затем каталоги
 */
/**
 * @param {string} path Текущий каталог для обхода
 * @param {WalkContext} [context] Внутренние опции для обхода дерева каталога
 * @yields {[string,import('fs').Dirent]}
 */
async function* __walk(path, context = {}) {
  const { fileFirst, include, exclude } = context
  const files = await readdir(path, { withFileTypes: true })

  for (const file of files) {
    const filePath = join(path, file.name)
    const isInclude = !include || __searchPathByRegExp(include, filePath)
    const isExclude = exclude ? __searchPathByRegExp(exclude, filePath) : false

    if (isExclude && !(include && isInclude)) {
      continue
    }

    if (file.isDirectory()) {
      if (fileFirst) {
        yield* __walk(filePath, context)
        if (isInclude) {
          yield [filePath, file]
        }
      } else {
        const needNested = isInclude ? yield [filePath, file] : true

        if (needNested !== false) {
          yield* __walk(filePath, context)
        }
      }
    } else {
      if (isInclude) {
        yield [filePath, file]
      }
    }
  }
}


/**
 * @typedef CopyOptions Опции управления копированием файлов и каталогов
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
async function copy(src, dest, { throwIfExists, removeNonExists } = {}) {
  const srcStat = await stat(src)

  if (srcStat.isDirectory()) {
    await __copy(src, dest, { throwIfExists, removeNonExists })
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
async function __copy(src, dest, { throwIfExists, removeNonExists }) {
  const mkdirOptions = { recursive: !throwIfExists }
  const existentPaths = removeNonExists ? [] : false

  await mkdir(dest, mkdirOptions)
  for await (const [path, dirent] of __walk(src)) {
    const destPath = join(dest, relative(src, path))

    if (existentPaths) {
      existentPaths.push(destPath)
    }
    if (dirent.isDirectory()) {
      await mkdir(destPath, mkdirOptions)
    } else {
      await copyFile(path, destPath)
    }
  }
  if (existentPaths) {
    for await (const [path] of __walk(dest, { fileFirst: true })) {
      if (!existentPaths.includes(path)) {
        await remove(path)
      }
    }
  }
}


/**
 * Удаление файла или каталога со всем содержимым
 *
 * @param {string} path Каталог или файл
 * @returns {Promise<void>}
 */
async function remove(path) {
  await rm(path, { force: true, recursive: true })
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
