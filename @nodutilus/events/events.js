/** @module  @nodutilus/events */

/** @typedef {any} Event */
/** @typedef {function(...any)} Listener */
/** @typedef {Map<Event, Set<Listener>>} ListenersMap */
/** @type {WeakMap<EventEmitter, ListenersMap>} */
const privateEventsMap = new WeakMap()
/** @type {WeakMap<PromiseEventEmitter, EventEmitter>} */
const privatePromiseEventEmittersMap = new WeakMap()
/** @type {WeakMap<EventEmitter, any>} */
const privatePromiseEventEmittersReason = new WeakMap()
/** @type {Object<string, Symbol>} */
const pemEvents = {
  resolve: Symbol('PromiseEventEmitter#event:resolve'),
  reject: Symbol('PromiseEventEmitter#event:reject')
}

/**
 * Управление событиями и подписками, в т.ч. асинхронными
 */
class EventEmitter {

  /** @returns {EventEmitter} */
  constructor() {
    privateEventsMap.set(this, new Map())
  }

  /**
   * @returns {number}
   */
  get count() {
    const events = privateEventsMap.get(this)

    return events.size
  }

  /**
   * @param {Event} event
   * @returns {number}
   */
  listenerCount(event) {
    const listeners = privateEventsMap.get(this).get(event)

    if (listeners) {
      return listeners.size
    } else {
      return 0
    }
  }

  /**
   * @param {EventEmitter} instance
   * @param {Event} event
   * @param  {...any} args
   * @returns {Promise<void>}
   */
  static async emitForClassMethod(instance, event, ...args) {
    const isMethod = typeof instance[event] === 'function'
    const isNotOwn = !Reflect.has(this.prototype, event)

    if (isMethod && isNotOwn) {
      await instance[event](...args)
    }
  }

  /**
   * @param {EventEmitter} instance
   * @param {Event} event
   * @param  {...any} args
   * @returns {Promise<void>}
   */
  static async emitForBasicListeners(instance, event, ...args) {
    const listeners = privateEventsMap.get(instance).get(event)

    if (listeners) {
      for (const listener of listeners) {
        await listener(...args)
      }
    }
  }

  /**
   * @param {Event} event
   * @param  {...any} args
   * @returns {Promise<void>}
   */
  async emit(event, ...args) {
    await EventEmitter.emitForClassMethod(this, event, ...args)
    await EventEmitter.emitForBasicListeners(this, event, ...args)
  }

  /**
   * @param {Event} event
   * @returns {boolean}
   */
  has(event) {
    return privateEventsMap.get(this).has(event)
  }

  /**
   * @param {Event} event
   * @param  {Listener} listener
   * @returns {EventEmitter}
   */
  on(event, listener) {
    const events = privateEventsMap.get(this)

    if (!events.has(event)) {
      events.set(event, new Set())
    }

    events.get(event).add(listener)

    return this
  }

  /**
   * @param {Event} event
   * @param  {Listener} listener
   * @returns {EventEmitter}
   */
  off(event, listener) {
    const events = privateEventsMap.get(this)
    const listeners = events.get(event)

    if (listeners) {
      listeners.delete(listener)
      if (!listeners.size) {
        events.delete(event)
      }
    }

    return this
  }

  /**
   * @param {Event} event
   * @returns {Promise<Array<any>>}
   */
  once(event) {
    const events = privateEventsMap.get(this)

    if (!events.has(event)) {
      events.set(event, new Set())
    }

    return new Promise(resolve => {
      const listeners = events.get(event)
      const listener = (...args) => {
        resolve(args)
        listeners.delete(listener)
        if (!listeners.size) {
          events.delete(event)
        }
      }

      listeners.add(listener)
    })
  }

}

/**
 * Управление событиями в режиме <Promise>
 */
class PromiseEventEmitter extends Promise {

  /**
   * @callback AsyncExecutor
   * @param {PromiseEventEmitter} emitter
   * @returns {Promise<void>}
   */
  /**
   * @param {AsyncExecutor} [asyncExecutor]
   */
  constructor(asyncExecutor) {
    const executorIsFunction = typeof asyncExecutor === 'function'

    if (executorIsFunction && asyncExecutor.length === 2) {
      super(asyncExecutor)
    } else {
      const emitter = new EventEmitter()
      const promiseExecutor = (resolve, reject) => {
        emitter
          .on(pemEvents.resolve, value => {
            resolve(value)
          })
          .on(pemEvents.reject, reason => {
            if (!privatePromiseEventEmittersReason.has(emitter)) {
              privatePromiseEventEmittersReason.set(emitter, reason)
              reject(reason)
            }
          })
      }

      super(promiseExecutor)

      privatePromiseEventEmittersMap.set(this, emitter)

      if (executorIsFunction) {
        (async () => {
          await asyncExecutor(this)
        })().catch(reason => {
          emitter.emit(pemEvents.reject, reason)
        })
      }
    }
  }

  /**
   * @callback onFulfilledFunction
   * @param {any} value
   * @returns {Promise<any>}
   */
  /**
   * @callback onRejectedFunction
   * @param {any} reason
   * @returns {Promise<any>}
   */
  /**
   * @param {onFulfilledFunction} [onFulfilled]
   * @param {onRejectedFunction} [onRejected]
   * @returns {Promise<any>}
   */
  ['then'](onFulfilled, onRejected) {
    return new Promise((resolve, reject) => {
      super.then(
        value => {
          if (typeof onFulfilled === 'function') {
            try {
              resolve(onFulfilled(value))
            } catch (error) {
              reject(error)
            }
          } else {
            resolve(value)
          }
        },
        reason => {
          if (typeof onRejected === 'function') {
            try {
              resolve(onRejected(reason))
            } catch (error) {
              reject(error)
            }
          } else {
            reject(reason)
          }
        })
    })
  }

  /**
   * @returns {number}
   */
  get count() {
    const emitter = privatePromiseEventEmittersMap.get(this)

    return emitter.count
  }

  /**
   * @param {Event} event
   * @returns {number}
   */
  listenerCount(event) {
    const emitter = privatePromiseEventEmittersMap.get(this)

    return emitter.listenerCount(event)
  }

  /**
   * @param  {...any} args
   * @returns {Promise<void>}
   */
  static async emitForClassMethod(...args) {
    await EventEmitter.emitForClassMethod.apply(PromiseEventEmitter, args)
  }

  /**
   * @param {Event} event
   * @param  {...any} args
   * @returns {Promise<void>}
   */
  emit(event, ...args) {
    const self = this

    return new Promise((resolve, reject) => {
      process.nextTick(() => {
        const emitter = privatePromiseEventEmittersMap.get(this)

        if (privatePromiseEventEmittersReason.has(emitter)) {
          reject(privatePromiseEventEmittersReason.get(emitter))
        } else {
          (async () => {
            await PromiseEventEmitter.emitForClassMethod(self, event, ...args)
            await EventEmitter.emitForBasicListeners(emitter, event, ...args)
          })().then(resolve, reject)
        }
      })
    })
  }

  /**
   * @param {Event} event
   * @returns {boolean}
   */
  has(event) {
    const emitter = privatePromiseEventEmittersMap.get(this)

    return emitter.has(event)
  }

  /**
   * @param {Event} event
   * @param  {Listener} listener
   * @returns {PromiseEventEmitter}
   */
  on(event, listener) {
    const emitter = privatePromiseEventEmittersMap.get(this)

    emitter.on(event, listener)

    return this
  }

  /**
   * @param {Event} event
   * @param  {Listener} listener
   * @returns {PromiseEventEmitter}
   */
  off(event, listener) {
    const emitter = privatePromiseEventEmittersMap.get(this)

    emitter.off(event, listener)

    return this
  }

  /**
   * @param {Event} event
   * @returns {Promise<Array<any>>}
   */
  once(event) {
    const emitter = privatePromiseEventEmittersMap.get(this)

    return new Promise((resolve, reject) => {
      if (privatePromiseEventEmittersReason.has(emitter)) {
        reject(privatePromiseEventEmittersReason.get(emitter))
      } else {
        emitter.once(pemEvents.reject).then(([reason]) => {
          reject(reason)
        })
        emitter.once(event).then(value => {
          resolve(value)
        })
      }
    })
  }

  /**
   * @param {any} value
   */
  resolve(value) {
    const emitter = privatePromiseEventEmittersMap.get(this)

    emitter.emit(pemEvents.resolve, value)
  }

  /**
   * @param {any} reason
   */
  reject(reason) {
    const emitter = privatePromiseEventEmittersMap.get(this)

    emitter.emit(pemEvents.reject, reason)
  }

}


export {
  EventEmitter,
  PromiseEventEmitter
}
