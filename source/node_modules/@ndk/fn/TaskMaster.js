/** @module {TaskMaster} @ndk/fn/TaskMaster */
'use strict';
const PromiseEventEmitter = require('./PromiseEventEmitter');

const defaults = {
  workersCount: require('os').cpus().length - 1
};

/**
 * Объект с данными задачи для выполнения в мастере.
 * Каждая задача должна быть уникальна, task1 !== task2
 *
 * @typedef {Object} TaskMaster~task
 */

/**
 * Асинхронная функция выполняющая задач, добавленных в мастер
 *
 * @async
 * @callback TaskMaster~executor
 * @param {TaskMaster~task} task Объект с данными для выполнения задачи
 * @returns {any} Результат выполнения задачи
 */

/**
 * Дополнительные опции для мастера задач
 *
 * @typedef TaskMaster~options
 * @property {number} [workersCount=os.cpus().length-1] Максимальное число
 *  параллельно выполняемых задач. По умолчанию = кол-во ядер процессора - 1
 */

module.exports = class TaskMaster extends PromiseEventEmitter {

  /**
   * Мастер управления задачами
   *
   * @class TaskMaster
   * @extends PromiseEventEmitter
   * @param {Array<TaskMaster~task>} [tasks=] Начальный список задач
   * @param {TaskMaster~executor} executor Функция выполняющая задачи
   * @param {TaskMaster~options} [options=] Доп. опции для мастера
   * @property {Array<TaskMaster~task>} queue Очередь задач
   * @property {Array<TaskMaster~TaskMaster>} workers Список обработчиков выполняющих задачи,
   *  в количестве равном параметру TaskMaster~options#workersCount
   * @property {boolean} isEnd Флаг, указывающий на завершение добавления задач в мастер,
   *  и переход к состоянию ожидания завершения всех задач
   * @emits TaskMaster#ready Срабатывает при завершении задачи
   * @emits TaskMaster#error Срабатывает при ошибке выполнения задачи
   * @throws {Error} Неправильные аргументы
   * @throws {Promise.reject} Ошибка, после которой невозможно выполнять задачи
   */
  constructor(tasks, executor, options = {}) {
    if (typeof tasks === 'function' && tasks.length === 2) {
      super(tasks);
    } else {
      if (typeof tasks === 'function') {
        options = executor || options;
        executor = tasks;
        tasks = undefined;
      }
      if (typeof executor !== 'function') {
        throw new Error('executor is not a function');
      }
      const queue = [];
      const workers = [];
      const workersCount = options.workersCount || defaults.workersCount;
      const workerOptions = { queue, executor };
      for (let i = 0; i < workersCount; i++) {
        workers.push(new Worker(workerOptions));
      }
      super((resolve, reject, emitter) => {
        for (let worker of workers) {
          worker.on(TaskMaster.EVENT_READY,
            (task, result) => emitter.emit(TaskMaster.EVENT_READY, task, result)
          );
          worker.on(TaskMaster.EVENT_ERROR,
            (task, error) => emitter.emit(TaskMaster.EVENT_ERROR, task, error)
          );
        }
        Promise.all(workers).then(resolve, reject);
      });
      this.queue = queue;
      this.workers = workers;
      if (tasks) {
        this.add(...tasks);
      }
    }
  }

  /**
   * Добавление задач в мастер
   *
   * @method TaskMaster#add
   * @param {TaskMaster~task} ...task Каждый аргумент - отдельная задача для добавления в очередь
   * @returns {TaskMaster}
   * @throws {Error} Добавление задачи после завершения мастера
   */
  add(...tasks) {
    if (!this.isEnd) {
      this.queue.push(...tasks);
      for (let worker of this.workers) {
        setImmediate(() => worker.execute());
      }
      return this;
    } else {
      throw new Error('TaskMaster is ended');
    }
  }

  /**
   * Блокировка добавления задач.
   * После вызова, добавление задач в мастер, будет заблокировано,
   *  а после выполнения всех задач мастер завершиться (будет вызван метод resolve).
   *
   * @method TaskMaster#end
   * @returns {TaskMaster}
   */
  end() {
    this.isEnd = true;
    for (let worker of this.workers) {
      worker.isEnd = true;
      setImmediate(() => worker.execute());
    }
    return this;
  }

  /**
   * Событие вызываемое при успешном завершении задачи
   *
   * @event TaskMaster#ready
   * @param {TaskMaster~task} task Данные задачи
   * @param {any} result Результат выполния задачи
   */
  static get EVENT_READY() {
    return 'ready';
  }

  /**
   * Событие вызываемое при ошибке выполнения задачи
   *
   * @event TaskMaster#error
   * @param {TaskMaster~task} task Данные задачи
   * @param {Error} error Данные об ошибке
   */
  static get EVENT_ERROR() {
    return 'error';
  }

};

/**
 * Опции для обработчика задач
 * @typedef TaskMaster~Worker~options
 * @param {Array<TaskMaster~task>} queue Общая очередь задач
 * @param {TaskMaster~executor} executor Общая функция выполняющая задачи
 */

class Worker extends PromiseEventEmitter {

  /**
   * Класс для обработки очереди задач мастера
   *
   * @class TaskMaster~Worker
   * @extends PromiseEventEmitter
   * @param {TaskMaster~Worker~options} options Опции для обработчика задач
   * @property {Array<TaskMaster~task>} queue Общая очередь задач
   * @property {TaskMaster~executor} executor Общая функция выполняющая задач
   * @property {boolean} isEnd Флаг, указывающий на завершение добавления задач в мастер
   * @property {TaskMaster~task} currentTask Текущая выполняемая задача
   * @emits TaskMaster~Worker#ready Срабатывает при завершении задачи
   * @emits TaskMaster~Worker#error Срабатывает при ошибке выполнения задачи
   * @emits TaskMaster~Worker#end Срабатывает при завершении обработки очереди
   * @emits TaskMaster~Worker#fatalError Срабатывает при ошибке, после которой невозможно выполнять задачи
   */
  constructor(options) {
    if (typeof options === 'function') {
      super(options);
    } else {
      super((resolve, reject, emitter) => {
        emitter.on(Worker.EVENT_END, resolve);
        emitter.on(Worker.EVENT_FATAL_ERROR, reject);
      });
      this.queue = options.queue;
      this.executor = options.executor;
    }
  }

  /**
   * Выполнение следующей задачи из очереди
   *
   * @method TaskMaster~Worker#execute
   */
  execute() {
    if (!this.currentTask) {
      if (this.queue.length > 0) {
        this.currentTask = this.queue.shift();
        (async() => await this.executor(this.currentTask))().then(
          result => {
            this.emit(Worker.EVENT_READY, this.currentTask, result);
          },
          error => {
            this.emit(Worker.EVENT_ERROR, this.currentTask, error);
          }
        ).then(() => {
          this.currentTask = null;
          setImmediate(() => this.execute());
        });
      } else {
        if (this.isEnd) {
          this.emit(Worker.EVENT_END);
        }
      }
    }
  }

  /**
   * Событие вызываемое при успешном завершении задачи
   *
   * @event TaskMaster~Worker#ready
   * @param {TaskMaster~task} task Данные задачи
   * @param {any} result Результат выполнения
   */
  static get EVENT_READY() {
    return 'ready';
  }

  /**
   * Событие вызываемое при ошибке выполнения задачи
   *
   * @event TaskMaster~Worker#error
   * @param {TaskMaster~task} task Данные задачи
   * @param {Error} error Данные об ошибке
   */
  static get EVENT_ERROR() {
    return 'error';
  }

  /**
   * Событие о завершении обработки очереди.
   * Вызывается при установленном флаге isEnd и пустой очереди.
   *
   * @event TaskMaster~Worker#end
   */
  static get EVENT_END() {
    return 'end';
  }

  /**
   * Событие о возникновении ошибки, при которой невозможно выполнять задачи.
   * В текущем классе не используется.
   * Реализуется на основе дополнительных проверок в наследниках класса Worker.
   *
   * @event TaskMaster~Worker#fatalError
   * @param {Error} error Данные об ошибке
   */
  static get EVENT_FATAL_ERROR() {
    return 'fatalError';
  }

}
