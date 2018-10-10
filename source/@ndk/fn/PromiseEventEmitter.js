/** @module {PromiseEventEmitter} @ndk/fn/PromiseEventEmitter */
'use strict';
const EventEmitter = require('events');

/**
 * Функция-обработчик обещания.
 *
 * @callback PromiseEventEmitter~executor
 * @param {function(result)} resolve Функция, вызыващая успешное выполнение обещания
 * @param {function(error)} reject Функция, которая отклоняет обещание с ошибкой
 * @param {EventEmitter} emitter Экземпляр класса для работы с событиями
 * @returns {undefined}
 */

module.exports = class PromiseEventEmitter extends Promise {

  /**
   * Класс "Обещания" с поддержкой событийной модели.
   * Позволяет при помощи событий взаимодействовать с внутренним обработчиком обещания.
   * Обладает всеми свойствами Promise, в т. ч. возможностью использования в async/await.
   *
   * Работа с событиями возможна только у текущего экземпляра.
   * Вызовы методов класса Promise (then, catch, all...), вернут новый экземпляр Promise,
   *  не содержащий методов класса EventEmitter.
   * Вызов методов on, once вернет ссылку на текущий экземпляр PromiseEventEmitter.
   *
   * @class PromiseEventEmitter
   * @extends Promise
   * @param {PromiseEventEmitter~executor} executor Функция-обработчик обещания
   * @property {EventEmitter} emitter Экземпляр класса для работы с событиями
   */
  constructor(executor) {
    if (executor.length == 3) {
      const emitter = new EventEmitter();
      super((resolve, reject) => executor(resolve, reject, emitter));
      this.emitter = emitter;
    } else {
      super(executor);
    }
  }

  /**
   * Синхронно вызывает всех слушателей указанного события с переданными аргументами.
   * Обработчики вызываются в порядке их регистрации.
   *
   * @method PromiseEventEmitter#emit
   * @param {any} eventName Имя события
   * @param {any} ...args Аргументы для обработчика
   * @returns {boolean}
   */
  emit(eventName, ...args) {
    return this.emitter.emit(eventName, ...args);
  }

  /**
   * Обработчик события
   *
   * @callback PromiseEventEmitter~listener
   * @param {any} ...args Аргументы для обработчика, переданные в emit
   * @returns {undefined}
   */

  /**
   * Добавляет обработчик события в конец списка слушателей события,
   *  без проверки того, что данный обработчик уже был добавлен.
   * Возвращает текущий экземпляр PromiseEventEmitter.
   *
   * @method PromiseEventEmitter#on
   * @param {any} eventName Имя события
   * @param {PromiseEventEmitter~listener} listener Обработчик события
   * @returns {PromiseEventEmitter}
   */
  on(eventName, listener) {
    this.emitter.on(eventName, listener.bind());
    return this;
  }

  /**
   * Добавляет обработчик события в конец списка слушателей события.
   * При следующем вызове события, обработчик удалиться из списка слушателей.
   * Возвращает текущий экземпляр PromiseEventEmitter.
   *
   * @method PromiseEventEmitter#once
   * @param {any} eventName Имя события
   * @param {PromiseEventEmitter~listener} listener Обработчик события
   * @returns {PromiseEventEmitter}
   */
  once(eventName, listener) {
    this.emitter.once(eventName, listener.bind());
    return this;
  }
};
