/** @module  @ndk/fn/events */
'use strict'

/** @typedef {any} Event */
/** @typedef {function(...any)} Listener */
/** @typedef {Map<Event,Set<Listener>>} ListenersMap */
/** @type {WeakMap<EventEmitter,ListenersMap>} */
const privateEventsMap = new WeakMap()
/** @type {Object<string,Symbol>} */
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

}


class PromiseEventEmitter extends Promise {

  /**
   * @callback PromiseExecutor
   * @param {function} resolve
   * @param {?function} reject
   * @param {?EventEmitter} emitter
   * @returns {?Promise<void>}
   */
  /**
   * @param {?PromiseExecutor} executor
   */
  constructor(executor) {
    const emitter = new EventEmitter()

    super((resolve, reject) => {
      emitter.on(pemEvents.resolve, resolve).on(pemEvents.reject, reject)
      if (executor) {
        const promise = executor(resolve, reject, emitter)

        if (promise instanceof Promise) {
          promise.catch(reject)
        }
      }
    })

    this.emitter = emitter
  }

  /**
   * @param {Event} event
   * @param  {...any} args
   * @returns {Promise<void>}
   */
  async emit(event, ...args) {
    await this.emitter.emit(event, ...args)
  }

  /**
   * @param {Event} event
   * @param  {Listener} listener
   * @returns {PromiseEventEmitter}
   */
  on(event, listener) {
    this.emitter.on(event, listener)

    return this
  }

  /**
   * @param {any} value
   * @returns {Promise<void>}
   */
  async resolve(value) {
    await this.emit(pemEvents.resolve, value)
  }

  /**
   * @param {any} reason
   * @returns {Promise<void>}
   */
  async reject(reason) {
    await this.emit(pemEvents.reject, reason)
  }

}


exports.EventEmitter = EventEmitter
exports.PromiseEventEmitter = PromiseEventEmitter
