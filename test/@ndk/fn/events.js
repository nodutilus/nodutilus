'use strict'

const { Test, assert } = require('@ndk/test')
const { EventEmitter } = require('@ndk/fn/events')


exports['@ndk/fn/events'] = class FnEventsTest extends Test {

  /** Попытка удаление события до подписки не должна падать */
  ['EventEmitter - удаление события до подписки']() {
    const em = new EventEmitter()
    const fn = () => em.delete('test', fn)

    assert.doesNotThrow(fn)
  }

  /** После отписки от последнего события сет со слушателями удаляется.
   * На данное поведение опирается метод "has" */
  ['EventEmitter - удаление события после удаления последнего слушателя']() {
    const em = new EventEmitter()
    const fn1 = () => em.delete('test', fn1)
    const fn2 = () => em.delete('test', fn2)

    em.on('test', fn1)
      .on('test', fn2)

    assert.doesNotThrow(fn1)
    assert(em.has('test') === true)
    assert.doesNotThrow(fn2)
    assert(em.has('test') === false)
  }

}
