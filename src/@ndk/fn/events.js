/** @module  @ndk/fn/events */
'use strict'

/** @typedef {any} Event */
/** @typedef {function(...any)} Listener */
/** @typedef {Map<Event,Set<Listener>>} ListenersMap */

/** @type {WeakMap<EventEmitter,ListenersMap>} */
const privateEventsMap = new WeakMap()


class EventEmitter {

  /** @returns {EventEmitter} */
  constructor() {
    privateEventsMap.set(this, new Map())
  }

  /**
   * @param {Event} event
   * @param  {...any} args
   * @returns {EventEmitter}
   */
  async emit(event, ...args) {
    const listeners = privateEventsMap.get(this).get(event)

    if (listeners) {
      for (const listener of listeners) {
        await listener(...args)
      }
    }

    return this
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


exports.EventEmitter = EventEmitter
