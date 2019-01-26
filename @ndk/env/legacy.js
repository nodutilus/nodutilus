/** @module @ndk/env/legacy */
'use strict';

const { dirname, join } = require('path');
const { existsSync } = require('fs');
const { homedir } = require('os');

/**
 * Определяет соответствие параметров из process.env параметрам @ndk/env,
 *  для переопределения при запуске приложения
 *
 * @name envKeys
 * @type {Object}
 * @property {string} appRoot Корневой каталог приложения
 * @property {string} appName Имя приложения
 */
const envKeys = {
  appRoot: '_NDK_ENV_APP_ROOT',
  appName: '_NDK_ENV_APP_NAME'
};

/**
 * Корневой каталог приложения.
 * Определяется как каталог, в котором находится файл `package.json`,
 *  относительно пути основного файла приложения `require.main.filename`,
 *  или параметра окружения при запуске: `process.env[envKeys.appRoot]`
 *
 * @name appRoot
 * @type {string}
 */
var appRoot;

/**
 * Путь к файлу NPM пакета приложения.
 * Определяется как файл `package.json` в корневом каталоге приложения. @see module:@ndk/env.appRoot
 *
 * @name appPackage
 * @type {string}
 */
var appPackage;

/**
 * Имя приложения.
 * Определяется как свойство `name`, указанное в файле `package.json`,
 *  находящегося в корне приложения. @see module:@ndk/env.appRoot.
 * Может быть перекрыто параметром окружения при запуске: `process.env[envKeys.appName]`
 *
 * @name appName
 * @type {string}
 */
var appName;

/**
 * Пользовательский домашний каталог приложения.
 * Определяется как: `<user home dir>/.<@ndk/env.appName>`
 *
 * @name appHome
 * @type {string}
 * @example
 *  linux - `/home/user/username/.myapp`
 *  windows - `C:\Users\username\.myapp`
 */
var appHome;

/**
 * Порядковые аргументы командной строки, переданные в приложение
 *
 * @example
 *  > node myapp.js arg1 --arg2 val2 arg3 --arg4=val4 arg5 --arg6 -arg7 val7 -arg8=val8 -arg9
 *  > ndk_env = require('@ndk/env')
 *  > ndk_env.appArgs
 *  ['arg1', 'arg3', 'arg5']
 * @name appArgs
 * @type {Array<string>}
 */
const appArgs = [];

/**
 * Именованные аргументы командной строки, переданные в приложение
 *
 * @example
 *  > node myapp.js arg1 --arg2 val2 arg3 --arg4=val4 arg5 --arg6 -arg7 val7 -arg8=val8 -arg9
 *  > ndk_env = require('@ndk/env')
 *  > ndk_env.appKwargs
 *  { 'arg2': 'val2', 'arg4': 'val4', 'arg6': true, 'arg7': 'val7', 'arg8': 'val8', 'arg9': true }
 * @name appKwargs
 * @type {Object<string|boolean>}
 */
const appKwargs = {};


// Определение корня и файла описания для NPM
if (envKeys.appRoot in process.env) {
  appRoot = process.env[envKeys.appRoot];
  const packagejson = join(appRoot, 'package.json');
  if (existsSync(packagejson)) {
    appPackage = packagejson;
  }
} else if (require.main) {
  let path = dirname(require.main.filename),
    parent = dirname(path),
    exist = false,
    packagejson;
  while (!(parent === path)) {
    exist = existsSync(packagejson = join(path, 'package.json'));
    if (exist) {
      break;
    }
    path = parent;
    parent = dirname(path);
  }
  if (exist) {
    appRoot = path;
    appPackage = packagejson;
  }
}


// Определение имени
if (envKeys.appName in process.env) {
  appName = process.env[envKeys.appName];
} else if (appPackage) {
  appName = require(appPackage).name;
}


// Определение домашнего каталога
if (typeof appName === 'string') {
  appHome = join(homedir(), '.' + appName);
}


// Разбор входных аргументов переданных в приложение
{
  let argvDashRE = /^--?/;
  let argvNameRE = /^(\w+)=(.*)$/;
  let processArgv = global.process.argv.slice();
  processArgv.shift();
  processArgv.shift();
  while (processArgv.length > 0) {
    let item = processArgv.shift();
    if (argvDashRE.test(item)) {
      let name = item.replace(argvDashRE, '');
      if (!(name in appKwargs)) {
        let nextItem;
        if (argvNameRE.test(name)) {
          let nameExec = argvNameRE.exec(name);
          appKwargs[nameExec[1]] = nameExec[2];
        } else if ((nextItem = processArgv[0]) && !argvDashRE.test(nextItem)) {
          processArgv.shift();
          appKwargs[name] = nextItem;
        } else {
          appKwargs[name] = true;
        }
      }
    } else {
      appArgs.push(item);
    }
  }
}


exports.envKeys = envKeys;
exports.appRoot = appRoot;
exports.appPackage = appPackage;
exports.appName = appName;
exports.appHome = appHome;
exports.appArgs = appArgs;
exports.appKwargs = appKwargs;
