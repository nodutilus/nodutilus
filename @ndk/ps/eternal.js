/** @module @ndk/ps/eternal */
'use strict';
const {
  fork: node_fork,
  spawn: node_spawn
} = require('child_process');
const EventEmitter = require('events');

module.exports.fork = fork;
module.exports.spawn = spawn;

class ChildProcessEternal extends EventEmitter {
  /**
   * Класс для создания дочерних процессов, которые должны работать постоянно.
   * Автоматически перезапускает процесс при падении.
   *
   * @param {string} method
   * @param {Array} args
   */
  constructor(method, ...args) {
    super();
    this.method = method;
    this.args = args;
    ChildProcessEternal.recovery(this);
  }

  static recovery(cls) {
    cls.child_process = cls.method(...cls.args);
    cls.pid = cls.child_process.pid;
    cls.child_process.on('exit', () => ChildProcessEternal.recovery(cls));
    cls.child_process.on('error', error => cls.emit('error', error.stack || error));
  }
}

module.exports.ChildProcessEternal = ChildProcessEternal;

/**
 * Создает новый процесс NodeJS c переданными аргументами
 * См. {@link https://nodejs.org/api/child_process.html#child_process_child_process_fork_modulepath_args_options child_process.fork}
 *
 * @param {string} modulePath Путь к модулю для запуска
 * @param {Array} args Аргументы
 * @param {Object} options Опции
 * @returns {ChildProcessEternal}
 */
function fork(...args) {
  return new ChildProcessEternal(node_fork, ...args);
}

/**
 * Создает новый процесс, используя указанную команду с переданными аргументами
 * См. {@link https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options child_process.spawn}
 *
 * @param {string} command Комманда
 * @param {Array} args Аргументы
 * @param {Object} options Опции
 * @returns {ChildProcessEternal}
 */
function spawn(...args) {
  return new ChildProcessEternal(node_spawn, ...args);
}
