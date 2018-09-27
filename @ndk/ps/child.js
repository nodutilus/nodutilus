/** @module @ndk/ps/child */
'use strict';
const {
  fork: nodeFork,
  spawn: nodeSpawn,
  exec: nodeExec,
  ChildProcess
} = require('child_process');
const PromiseEventEmitter = require('@ndk/fn/PromiseEventEmitter');

/**
 * Класс для работы с дочерними процессами, основанный на механизме работы Promise.
 * Поддерживает событийную модель ChildProcess, совмещенную с возможностями Promise.
 * Обладает всеми свойствами Promise, в т. ч. возможностью использования в async/await.
 *
 * @class PEEChildProcess
 * @extends module:@ndk/fn/PromiseEventEmitter
 * @param {node:child_process.ChildProcess} Экземпляр класса ChildProcess базового модуля child_process.
 *  Представляющий порожденный процесс.
 *  См. {@link https://nodejs.org/api/child_process.html#child_process_class_childprocess ChildProcess}
 * @property {node:child_process.ChildProcess} childProcess Ссылка на связный экземпляр ChildProcess
 * @property {number} pid Идентификатор порожденного процесса
 * @property {string} stdout Вывод из процесса, полностью доступен после завершения Promise
 * @property {string} stderr Вывод ошибок из процесса, полностью доступен после завершения Promise
 */
class PEEChildProcess extends PromiseEventEmitter {
  constructor(childProcess) {
    var data = { stdout: '', stderr: '' };
    if (childProcess instanceof ChildProcess) {
      super((resolve, reject, emitter) => {
        if (childProcess.stdout) {
          childProcess.stdout.on('data', chunk => {
            chunk = String(chunk);
            data.stdout += chunk;
            emitter.emit('stdout', chunk.trim());
          });
        }
        if (childProcess.stderr) {
          childProcess.stderr.on('data', chunk => {
            chunk = String(chunk);
            data.stderr += chunk;
            emitter.emit('stderr', chunk.trim());
          });
        }
        childProcess.on('message', (...args) => emitter.emit('message', ...args));
        childProcess.on('error', error => {
          data.stderr += error.stack;
          emitter.emit('stderr', error.stack);
          reject(new Error(error));
        });
        childProcess.on('close', code => {
          data.stderr = data.stderr.trim();
          data.stdout = data.stdout.trim();
          if (code && (data.stderr || !childProcess.stderr)) {
            reject(new Error(data.stderr || `CHILD PROCESS EXIT CODE: ${code}`));
          } else {
            resolve(data.stdout);
          }
        });
      });
      this.childProcess = childProcess;
      this.pid = childProcess.pid;
      this._data = data;
    } else {
      super(childProcess);
    }
  }

  get stdout() {
    return this._data.stdout;
  }

  get stderr() {
    return this._data.stderr;
  }

  /**
   * Завершение дочернего процесса.
   * См. {@link https://nodejs.org/api/child_process.html#child_process_child_kill_signal ChildProcess#kill}
   *
   * @function PEEChildProcess#kill
   * @param {string} signal Сиглан посылаемый дочернему процессу
   * @returns {undefined}
   */
  kill(...args) {
    return this.childProcess.kill(...args);
  }

  /**
   * Отправка сообщения дочернему процессу.
   * См. {@link https://nodejs.org/api/child_process.html#child_process_child_send_message_sendhandle_options_callback ChildProcess#send}
   *
   * @function PEEChildProcess#send
   * @param {Object} message Сообщение
   * @param {Handle} sendHandle TCP server or socket для дочернего процесса
   * @param {Object} options Опции
   * @param {Function} callback Функция обратного вызова
   * @returns {boolean}
   */
  send(...args) {
    return this.childProcess.send(...args);
  }
}

module.exports.PEEChildProcess = PEEChildProcess;

/**
 * Создает новый процесс NodeJS c переданными аргументами
 * См. {@link https://nodejs.org/api/child_process.html#child_process_child_process_fork_modulepath_args_options child_process.fork}
 *
 * @param {string} modulePath Путь к модулю для запуска
 * @param {Array} [args=] Аргументы
 * @param {Object} [options=] Опции
 * @returns {PEEChildProcess}
 */
function fork(...args) {
  let options = args[args.length - 1];
  if (typeof options === 'object' && !('stdio' in options)) {
    options.stdio = ['ignore', 'pipe', 'pipe', 'ipc'];
  }
  return new PEEChildProcess(nodeFork(...args));
}

/**
 * Создает новый процесс, используя указанную команду с переданными аргументами
 * См. {@link https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options child_process.spawn}
 *
 * @param {string} command Комманда
 * @param {Array} args Аргументы
 * @param {Object} options Опции
 * @returns {PEEChildProcess}
 */
function spawn(...args) {
  return new PEEChildProcess(nodeSpawn(...args));
}

/**
 * Создает новый процесс, используя оболочку операционной системы
 * См. {@link https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback child_process.exec}
 *
 * @param {string} command Комманда
 * @param {Object} options Опции
 * @returns {PEEChildProcess}
 */
function exec(...args) {
  return new PEEChildProcess(nodeExec(...args));
}

exports.fork = fork;
exports.spawn = spawn;
exports.exec = exec;
