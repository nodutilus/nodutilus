/** @module @ndk/ps/TaskMaster */
'use strict';
const { envKeys, appRoot } = require('@ndk/env');
const { cpus } = require('os');
const { fork } = require('child_process');
const PromiseEventEmitter = require('@ndk/fn/PromiseEventEmitter');
const consts = require('./consts');
const worker_module = __dirname + '/worker.js';
const default_workers_count = cpus().length - 1;
const wait_completing_task = new Map();

module.exports = class TaskMaster extends PromiseEventEmitter {
  /**
   * Мастер управления задачами
   *
   * @param {Object} options
   * @param {Object} options.file
   * @param {Object} options.method
   * @param {number} [options.workers=os.cpus().length - 1]
   * @param {Array<Object>} [options.tasks=]
   */
  constructor(options) {
    if (typeof options === 'function') {
      super(options);
    } else {
      const worker_options = {
        env: {
          [envKeys.appRoot]: appRoot,
          '@ndk/ps/TaskMaster:file': require.resolve(options.file),
          '@ndk/ps/TaskMaster:method': String(options.method)
        },
        queue: []
      };
      const workers_count = options.workers || default_workers_count;
      const workers = [];
      for (let i = 0; i < workers_count; i++) {
        let worker = new Worker(worker_options);
        worker.on(consts.EV_DONE_TASK, (task, result) => {
          if (wait_completing_task.has(task)) {
            wait_completing_task.get(task).resolve(result);
            wait_completing_task.delete(task);
          }
          this.emit('done', task, result);
        });
        worker.on(consts.EV_ERROR, (task, err) => {
          if (wait_completing_task.has(task)) {
            wait_completing_task.get(task).reject(err);
            wait_completing_task.delete(task);
          }
          this.emit('error', task, err);
        });
        worker.on(consts.EV_ADD_TASK, task => this.add(task));
        workers.push(worker);
      }
      super((resolve, reject, emitter) => {
        Promise.all(workers).then(() => {
          resolve();
          emitter.emit('end');
        }, reject);
      });
      this.workers = workers;
      this.queue = worker_options.queue;
      if ('tasks' in options) {
        this.queue.push(...options.tasks);
        let run_count = Math.min(options.tasks.length, workers_count);
        for (let i = 0; i < run_count; i++) {
          this.workers[i].run();
        }
      }
    }
  }

  /**
   * Добавить задачу
   *
   * @param {Object} task
   */
  add(task) {
    if (this.isEnd) {
      throw new Error('TaskMaster is ended');
    }
    if (task instanceof Array) {
      this.queue.push(...task);
      let run_count = Math.min(task.length, this.workers.length);
      for (let worker of this.workers) {
        if (worker.status === Worker.ST_STOPPED) {
          worker.run();
          run_count--;
          if (run_count < 1) {
            break;
          }
        }
      }
    } else {
      this.queue.push(task);
      for (let worker of this.workers) {
        if (worker.status === Worker.ST_STOPPED) {
          worker.run();
          break;
        }
      }
    }
    return this;
  }

  /**
   * Добавить задачу и дождаться её завершения
   */
  execute(task) {
    if (this.isEnd) {
      throw new Error('TaskMaster is ended');
    }
    let promise;
    if (task instanceof Array) {
      let promise_queue = [];
      for (let task_item of task) {
        promise_queue.push(new Promise((resolve, reject) => {
          wait_completing_task.set(task_item, { resolve, reject });
        }));
      }
      promise = Promise.all(promise_queue);
    } else {
      promise = new Promise((resolve, reject) => {
        wait_completing_task.set(task, { resolve, reject });
      });
    }
    this.add(task);
    return promise;
  }

  /**
   * Проверить есть ли простаивающие подпроцессы для запуска задач
   */
  isIdle() {
    for (let worker of this.workers) {
      if (worker.status === Worker.ST_STOPPED) {
        return true;
      }
    }
    return false;
  }

  /**
   * Заблокировать добавление задач и ожидать завершения выполнения
   */
  end() {
    this.isEnd = true;
    for (let worker of this.workers) {
      worker.isEnd = true;
      worker.run();
    }
    return this;
  }

};

class Worker extends PromiseEventEmitter {

  constructor(options) {
    if (typeof options === 'function') {
      super(options);
    } else {
      super((resolve, reject, emitter) => {
        emitter.on(consts.EV_FATAL_ERROR, (err) => reject(err));
        emitter.on(consts.EV_END_TASK_MASTER, resolve);
      });
      this.options = options;
      this.status = Worker.ST_STOPPED;
      this.childprocess = null;
    }
  }

  run() {
    if (this.status == Worker.ST_STOPPED) {
      if (this.options.queue.length > 0) {
        this.status = Worker.ST_PROCESSING;
        this.childprocess = fork(worker_module, { env: this.options.env, execArgv: [] });
        this.childprocess.on('message', (msg) => Worker[msg.event](this, msg.data));
        this.childprocess.on('error', (err) => Worker.onError(this, err));
        this.childprocess.on('exit', (code, signal) => Worker.onExit(this, code, signal));
      } else {
        if (this.isEnd) {
          this.emit(consts.EV_END_TASK_MASTER);
        }
      }
    }
  }

  static[consts.EV_GET_TASK](cls) {
    if (cls.options.queue.length > 0) {
      cls.task = cls.options.queue.shift();
      cls.childprocess.send({ event: consts.EV_SET_TASK, data: cls.task });
    } else {
      cls.childprocess.kill();
      cls.childprocess = null;
      if (cls.isEnd) {
        cls.emit(consts.EV_END_TASK_MASTER);
      }
    }
  }

  static[consts.EV_DONE_TASK](cls, result) {
    cls.emit(consts.EV_DONE_TASK, cls.task, result);
    cls.task = null;
  }

  static[consts.EV_ERROR](cls, err) {
    cls.emit(consts.EV_ERROR, cls.task, err);
    cls.task = null;
  }

  static[consts.EV_ADD_TASK](cls, task) {
    cls.emit(consts.EV_ADD_TASK, task);
  }

  static onError(cls, err) {
    cls.childprocess.kill();
    cls.childprocess = null;
    cls.status = Worker.ST_STOPPED;
    if (cls.task) {
      cls.emit(consts.EV_ERROR, cls.task, err);
      cls.run();
    } else {
      cls.emit(consts.EV_FATAL_ERROR, err);
    }
  }

  static onExit(cls, code, signal) {
    cls.childprocess = null;
    cls.status = Worker.ST_STOPPED;
    if (code) {
      let err = new Error(`Fatal error. Exit code: ${code}, signal: ${signal}`);
      if (cls.task) {
        cls.emit(consts.EV_ERROR, cls.task, err);
      } else {
        return cls.emit(consts.EV_FATAL_ERROR, err);
      }
    }
    cls.run();
  }

}

Worker.ST_STOPPED = 0;
Worker.ST_PROCESSING = 1;
