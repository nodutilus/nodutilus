/** @module {createCLI} @ndk/git/cli */
'use strict';
const { resolve } = require('path');
const { spawn } = require('@ndk/ps/child');
const __options = new WeakMap();
const __handler = { get: handler_get };

module.exports = createCLI;

/**
 * Экземпляр Proxy для работы с консольными командами git.
 * Каждое свойство является функцией выполняющей одноименную команду клиента git.
 * Вызов такой команды запускает дочерний процесс git и возвращает Promise, для ожидания результата.
 * Вызов данного экземпляра как функции, приводит к изменению рабочего каталога клиента git,
 * и методов обработки промежуточных сообщений.
 *
 * @typedef {Proxy<function(...args):@ndk/ps/child.PEEChildProcess>} createCLI~ProxyGIT
 * @param {string} [path=old_path] Рабочий каталог для клиента git, относительно ранее установленного каталога
 * @param {function(string)} [stdout=old_stdout] Новая функция приёмник,
 *  для вывода промежуточных сообщений от дочернего процесса
 * @param {function(string)} [stderr=old_stderr] Новая функция приёмник,
 *  для вывода промежуточных сообщений об ошибках от дочернего процесса
 */

/**
 * Создает экземпляр Proxy для работы с консольными командами git.
 * См. {@link createCLI~ProxyGIT ProxyGIT}
 *
 * @example
 * (async() => {
 *   var git = require('@ndk/git/cli')('./');
 *   await git.clone('git@github.com:user/repo.git');
 *   git('./ndk', null);
 *   var branchName = await git['rev-parse']('--abbrev-ref', 'HEAD');
 *   console.log('branch =', branchName);
 *   git(undefined, console.log);
 *   await git.log('-n', 1);
 * })().then(() => console.log('ready!')).catch(console.error);
 * @param {string} path Рабочий каталог для клиента git, относительно текущего рабочего каталога
 * @param {function(string)} [stdout=console.log] Функция приёмник,
 *  для вывода промежуточных сообщений от дочернего процесса
 * @param {function(string)} [stderr=console.error] Функция приёмник,
 *  для вывода промежуточных сообщений об ошибках от дочернего процесса
 * @function createCLI
 * @returns {createCLI~ProxyGIT}
 */
function createCLI(path, stdout = console.log, stderr = console.error) {
  const options = {
    path,
    stdout: stdout || (() => {}),
    stderr: stderr || (() => {})
  };
  var target = (path, stdout, stderr) => {
    options.path = (typeof path !== 'undefined' ? resolve(options.path, path) : options.path);
    options.stdout = (typeof stdout !== 'undefined' ? stdout || (() => {}) : options.stdout);
    options.stderr = (typeof stderr !== 'undefined' ? stderr || (() => {}) : options.stderr);
  };
  target.git = {};
  const proxy = new Proxy(target, __handler);
  __options.set(proxy, options);
  return proxy;
}

/**
 * Обработчик получения метода из экземпляра Proxy для работы с консольными командами git.
 * На лету генерирует методы для клиента git, запоминая их для последующего обращения
 * в свойстве 'git' целевой функции, по которой был создан экземпляр Proxy.
 *
 * @function createCLI~ProxyGIT~handler_get
 * @param {function(string)} target Целевая функция
 * @param {string} name Имя свойства
 * @param {Proxy} proxy Экземпляр Proxy
 * @returns {Proxy<function(...args):@ndk/ps/child.PEEChildProcess>}
 */
function handler_get(target, name, proxy) {
  return target.git[name] || (target.git[name] = {
    [name]: (...args) => {
      const options = __options.get(proxy);
      args.unshift(name);
      return spawn('git', args, { cwd: options.path })
        .on('stdout', options.stdout)
        .on('stderr', options.stderr);
    }
  }[name]);
}
