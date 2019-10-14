/** @module  @ndk/fn/events */
'use strict'

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


class EventEmitter {

  /** @returns {EventEmitter} */
  constructor() {
    privateEventsMap.set(this, new Map())
  }

  /**
   * @param {Event} event
   * @param  {...any} args
   * @returns {Promise<void>}
   */
  async emit(event, ...args) {
    const listeners = privateEventsMap.get(this).get(event)

    if (listeners) {
      for (const listener of listeners) {
        await listener(...args)
      }
    }
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
   * @returns {boolean}
   */
  delete(event, listener) {
    const events = privateEventsMap.get(this)
    const listeners = events.get(event)
    let result = false

    if (listeners) {
      result = listeners.delete(listener)
      if (!listeners.size) {
        events.delete(event)
      }
    }

    return result
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
    const AsyncFunction = Reflect.getPrototypeOf(EventEmitter.prototype.emit).constructor
    const emitter = new EventEmitter()
    const executor = (resolve, reject) => {
      emitter
        .on(pemEvents.resolve, value => {
          resolve(value)
        })
        .on(pemEvents.reject, reason => {
          privatePromiseEventEmittersReason.set(emitter, reason)
          reject(reason)
        })
    }

    super(executor)

    privatePromiseEventEmittersMap.set(this, emitter)


    if (asyncExecutor) {
      if (asyncExecutor instanceof AsyncFunction) {
        asyncExecutor(this).catch(reason => {
          emitter.emit(pemEvents.reject, reason)
        })
      } else {
        try {
          asyncExecutor(
            value => {
              emitter.emit(pemEvents.resolve, value)
            },
            reason => {
              emitter.emit(pemEvents.reject, reason)
            }
          )
        } catch (error) {
          emitter.emit(pemEvents.reject, error)
        }
      }
    }
  }

  /**
   * @param {*} onFulfilled
   * @param {*} onRejected
   * @returns {Promise<any>}
   */
  ['then'](onFulfilled, onRejected) {
    return super.then(onFulfilled, onRejected)
    // return new Promise((resolve, reject) => {
    //   debugger
    // })
  }

  /**
   * @param {*} onRejected
   * @returns {Promise<any>}
   */
  ['catch'](onRejected) {
    return this.then(undefined, onRejected)
  }

  /**
   * @param {*} onFinally
   * @returns {Promise<any>}
   */
  ['finally'](onFinally) {
    const finallyHandler = () => onFinally()

    return super.finally(finallyHandler)
    // return this.then(finallyHandler, finallyHandler)
  }

  /**
   * @param {Event} event
   * @param  {...any} args
   */
  emit(event, ...args) {
    const emitter = privatePromiseEventEmittersMap.get(this)

    if (privatePromiseEventEmittersReason.has(emitter)) {
      throw privatePromiseEventEmittersReason.get(emitter)
    } else {
      emitter.emit(event, ...args).catch(reason => {
        emitter.emit(pemEvents.reject, reason)
      })
    }
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


exports.EventEmitter = EventEmitter
exports.PromiseEventEmitter = PromiseEventEmitter
