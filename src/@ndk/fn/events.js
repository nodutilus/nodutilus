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
   * @param  {Listener} listener
   */
  on(event, listener) {
    const events = privateEventsMap.get(this)

    if (!events.has(event)) {
      events.set(event, new Set())
    }

    events.get(event).add(listener)
  }

}


exports.EventEmitter = EventEmitter
