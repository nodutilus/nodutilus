/** @module @nodutilus/fs */

import { dirname, join } from 'path'
import { promises as fsPromises, constants as fsConstants } from 'fs'

const { COPYFILE_EXCL } = fsConstants
const { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } = fsPromises
/**
 * @typedef CONSTANTS
 * @property {number} COPY_EXCL Завершать копирование ошибкой если файл или каталог уже существует
 * @property {number} COPY_RMNONEXISTENT При копировании со слиянием каталогов
 *  удалять найденные в целевом каталоге, но несуществующие в источнике каталоги и файлы
 * @property {number} WALK_FILEFIRST При обходе каталога сначала возвращать вложенные файлы затем каталоги
 * @property {number} WRITE_EXCL Завершать запись файла ошибкой если файл существует
 */
/** @type {CONSTANTS} */
const constants = Object.create(null)
const COPY_EXCL = constants.COPY_EXCL = 0b0001
const COPY_RMNONEXISTENT = constants.COPY_RMNONEXISTENT = 0b0010
const WALK_FILEFIRST = constants.WALK_FILEFIRST = 0b0100
const WRITE_EXCL = constants.WRITE_EXCL = 0b1000


/**
 * @callback Walker Функция обратного вызова для обработки результатов обхода дерева каталога
 * @param {string} path Имя найденного каталога или файла
 * @param {import('fs').Dirent} dirent Сущность записи каталога
 * @returns {void|boolean|Promise<void|boolean>} Если вернуть для каталога false,
 *  он будет проигнорирован (не работает с флагом WALK_FILEFIRST)
 */
/**
 * Обходит дерево каталога и возвращает вложенные каталоги и файлы в Walker
 *
 * @param {string} path Каталог для обхода
 * @param {number} [flags] Модификаторы поведения
 * @param {number}[flags.WALK_FILEFIRST] Возвращать сначало файлы
 * @param {Walker} [walker] Обработчик результатов обхода дерева каталога
 * @returns {Promise<void>}
 */
async function walk(path, flags, walker) {
  if (typeof flags === 'function') {
    [flags, walker] = [walker, flags]
  }
  await __walk('.', { root: path, flags, walker })
}


/**
 * @typedef WalkOptions Внутренние опции для метода обхода дерева каталога
 * @property {string} root Корневой каталог для обхода
 * @property {number} [flags] Модификаторы поведения
 * @property {number}[flags.WALK_FILEFIRST] Возвращать сначала файлы
 * @property {Walker} walker Обработчик результатов обхода дерева каталога
 */
/**
 * @param {string} path Текущий каталог для обхода
 * @param {WalkOptions} options Внутренние опции
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
 * Копирует файл или каталог со всем содержимым.
 * По умолчанию осуществляет слияние каталогов и перезапись файлов (управляется флагами).
 *
 * @param {string} src Каталог или файл источник
 * @param {string} dest Целевой каталог или файл
 * @param {number} flags Модификаторы поведения
 * @param {number}[flags.COPY_EXCL] Завершать копирование ошибкой если файл или каталог уже существует
 * @param {number}[flags.COPY_RMNONEXISTENT] Удалять при слиянии каталоги и файлы не найденные в источнике
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
 * Вспомогательная функция для рекурсивного обхода дерева каталогов при копировании
 *
 * @param {string} src Каталог источник
 * @param {string} dest Целевой каталог
 * @param {number} flags Модификаторы поведения
 * @param {number}[flags.COPY_EXCL] Завершать копирование ошибкой если файл или каталог уже существует
 * @param {number}[flags.COPY_RMNONEXISTENT] Удалять при слиянии каталоги и файлы не найденные в источнике
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
 * Запись файла в формате JSON
 *
 * @param {string} path Путь до файла
 * @param {object} data JOSN объект
 * @param {number} [flags] Модификаторы поведения
 * @param {number} [flags.WRITE_EXCL] Завершать запись файла ошибкой, если файл существует
 * @returns {Promise<void>}
 */
async function writeJSON(path, data, flags) {
  const jsonData = JSON.stringify(data, null, 2)

  await writeText(path, jsonData, flags)
}


/**
 * Запись файла в текстовом формате
 *
 * @param {string} path Путь до файла
 * @param {string} data Текст
 * @param {number} [flags] Модификаторы поведения
 * @param {number} [flags.WRITE_EXCL] Завершать запись файла ошибкой, если файл существует
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
