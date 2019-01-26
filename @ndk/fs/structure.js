/** @module @ndk/fs/structure */
'use strict';
const { join, resolve } = require('path');
const { createReadStream, createWriteStream } = require('fs');
const ndk_fs_promisify = require('./promisify');
const ndk_fs_structure = module.exports;

ndk_fs_structure.copy = copy;
ndk_fs_structure.copyfile = copyfile;
ndk_fs_structure.mkdir = mkdir;
ndk_fs_structure.remove = remove;
ndk_fs_structure.rmdir = rmdir;
ndk_fs_structure.symlink = symlink;
ndk_fs_structure.symlinkfile = symlinkfile;
ndk_fs_structure.unlink = unlink;
ndk_fs_structure.walk = walk;

/**
 * Копирует каталог со всем содержимым или файл из source в target
 *
 * @param {string} source Путь к исходному каталогу или файлу
 * @param {string} target Путь к конечному каталогу или файлу
 * @param {Object} [options={}]
 * @param {boolean} [options.rewrite=false] Перезаписать конечные файлы
 * @returns {Promise<undefined>}
 */
async function copy(source, target, options = { rewrite: false }) {
  let stat = await ndk_fs_promisify.stat(source);
  if (!stat.isDirectory()) {
    return await copyfile(source, target, {
      rewrite: options.rewrite
    });
  }
  await mkdir(target);
  await walk(source, async (path, stat) => {
    let target_path = join(target, path);
    if (stat.isDirectory()) {
      await mkdir(target_path);
    } else {
      let source_path = join(source, path);
      await copyfile(source_path, target_path, {
        rewrite: options.rewrite
      });
    }
  });
}

/**
 * Копирует файл из source в target
 *
 * @function copyfile
 * @param {string} source Путь к исходному файлу
 * @param {string} target Путь к конечному файлу
 * @param {Object} [options={}]
 * @param {boolean} [options.rewrite=false] Перезаписать конечный файл
 * @returns {Promise<undefined>}
 */
async function copyfile(source, target, options = { rewrite: false }) {
  return new Promise((resolve, reject) => {
    var wr, rd = createReadStream(source, { encoding: 'binary' })
      .on('error', (error) => {
        if (wr) {
          wr.close();
        }
        reject(error);
      })
      .on('open', () => {
        wr = createWriteStream(target, {
          flags: options.rewrite ? 'w' : 'wx',
          defaultEncoding: 'binary'
        }).on('error', (error) => {
          rd.close();
          reject(error);
        }).on('open', () => rd.pipe(wr)).on('finish', () => resolve());
      });
  });
}

/**
 * Создает каталог, если он не существует
 *
 * @function mkdir
 * @param {string} path Путь до каталога
 * @returns {Promise<undefined>}
 */
async function mkdir(path) {
  return ndk_fs_promisify.mkdir(path).catch(err => {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  });
}

/**
 * Удаляет файл или каталог со всем содержимым, если он существует
 *
 * @param {string} path Путь к каталогу или файлу
 * @returns {Promise<undefined>}
 */
async function remove(path) {
  const stat = await ndk_fs_promisify.stat(path).catch(err => {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  });
  if (stat && stat.isDirectory()) {
    await walk(path, async (itemPath, stat) => {
      const rmPath = join(path, itemPath);
      if (stat.isDirectory()) {
        await rmdir(rmPath);
      } else {
        await unlink(rmPath);
      }
    }, { topdown: false }).catch(err => {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    });
    await rmdir(path);
  } else {
    await unlink(path);
  }
}

/**
 * Удаляет каталог, если он существует
 *
 * @function rmdir
 * @param {string|Buffer|URL} path Путь к каталогу
 * @returns {Promise<undefined>}
 */
async function rmdir(path) {
  return ndk_fs_promisify.rmdir(path).catch(err => {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  });
}

/**
 * Для файла создает символическую ссылку.
 * Для каталога - повторяет структуру исходного каталога в конечном добавляя новые каталоги,
 * и создавая на все найденные файлы символические ссылки
 *
 * @function symlink
 * @param {string} target Путь к исходному каталогу или файлу
 * @param {string} path Путь к конечному каталогу, для создания ссылок, или до ссылки на файл
 * @returns {Promise<undefined>}
 */
async function symlink(target, path) {
  let stat = await ndk_fs_promisify.stat(target);
  if (!stat.isDirectory()) {
    return await symlinkfile(target, path);
  }
  await mkdir(path);
  await walk(target, async (sub_target, stat) => {
    let sub_path = join(path, sub_target);
    if (stat.isDirectory()) {
      await mkdir(sub_path);
    } else {
      let target_path = join(target, sub_target);
      await symlinkfile(target_path, sub_path);
    }
  });
}

/**
 * Создает символическую ссылку на файл
 *
 * @function symlinkfile
 * @param {string|Buffer|URL} target Путь до файла
 * @param {string|Buffer|URL} path Путь до ссылки
 * @returns {Promise<undefined>}
 */
async function symlinkfile(target, path) {
  return ndk_fs_promisify.symlink(target, path);
}

/**
 * Удаляет файл, если он существует
 *
 * @function unlink
 * @param {string|Buffer|URL} path Путь к файлу
 * @returns {Promise<undefined>}
 */
async function unlink(path) {
  return ndk_fs_promisify.unlink(path).catch(err => {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  });
}

/**
 * Метод обратного вызова для обхода списка каталогов и файлов метода walk.
 * Если возвращается true, файл будет добавлен в итоговый список.
 *
 * @callback walker
 * @param {string} file Путь до файла относительно "root"
 * @param {nodejs.fs.Stats} stat Объект с информаией о файле
 *  {@link https://nodejs.org/api/fs.html#fs_class_fs_stats Class: fs.Stats}
 * @returns {boolean|Promise<boolean>} False - исключить данный каталог или файл из итогового набора
 */
/**
 * Рекурсивно обходит весь список файлов и подкаталогов.
 * Возвращает список удовлетворяющий условиям отбора.
 *
 * @function walk
 * @param {string} root Путь до корневого каталога, с которого начнется обход
 * @param {walker} walker Обработчик списка файлов
 * @param {Object} options Дополнительные настройки
 * @param {boolean} [options.topdown=true] Определяет порядок обхода подкаталогов.
 *  Если параметр не задан или true, то walker вызывается для каталога, а потом для файлов и подкаталогов.
 *  Если параметр равен false, то walker вызывается для файлов и подкаталогов, а потом для каталога.
 * @param {Array<RegExp>} [options.include] Выражения для выбора при поиске только каталогов и файлов,
 *  удовлетворяющих хотя бы одному из регулярных выражений данного списка.
 * @param {Array<RegExp>} [options.exclude] Выражения для исключения каталогов и файлов при поиске,
 *  удовлетворяющих хотя бы одному из регулярных выражений данного списка.
 * @returns {Promise<Array<string>>}
 */
async function walk(root, walker, { topdown = true, include = [], exclude = [] } = {}) {
  if (typeof topdown === 'undefined') {
    topdown = true;
  }
  root = resolve(root.replace(/\\/g, '/'));
  return await __walk({}, root, walker, { topdown, include, exclude });
}

async function __walk({ subdir = '' }, root, walker, { topdown, include, exclude }) {
  const files = await ndk_fs_promisify.readdir(join(root, subdir));
  const result = [];
  next: for (let i = 0; i < files.length; i++) {
    let file = './' + join(subdir, files[i]).replace(/\\/g, '/');
    let push = true;
    for (let j = 0; j < exclude.length; j++) {
      if (exclude[j].test(file)) {
        continue next;
      }
    }
    if (include.length > 0) {
      push = false;
      for (let j = 0; j < include.length; j++) {
        if (include[j].test(file)) {
          push = true;
          break;
        }
      }
    }
    let stat = await ndk_fs_promisify.stat(join(root, file));
    if (push && topdown && (await walker(file, stat)) !== false) {
      result.push(file);
    }
    if (stat.isDirectory()) {
      let files = await __walk({ subdir: file }, root, walker, { topdown, include, exclude });
      result.push(...files);
    }
    if (push && !topdown && (await walker(file, stat)) !== false) {
      result.push(file);
    }
  }
  return result;
}
