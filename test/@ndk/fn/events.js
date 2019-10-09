'use strict'

const { Test, assert } = require('@ndk/test')
const { EventEmitter, PromiseEventEmitter } = require('@ndk/fn/events')


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

  /** emit не должен ничего возвращать, ни чейнится */
  async ['EventEmitter - emit не возвращает результат']() {
    const em = new EventEmitter()
    let value = 0

    em.on('test', () => value++)

    const p = em.emit('test')
    const result = await p

    assert(p instanceof Promise)
    assert(result === undefined)
    assert.equal(value, 1)
  }

  /** PEE создается наследованием из Promise, с добавлением emitter
   * при этом последующие then/catch так же создают PEE */
  async ['PromiseEventEmitter - создание, чейнинг']() {
    const pem = new PromiseEventEmitter()
    const tpem = pem.then(value => {
      return value + '+' + value
    })
    const t2pem = tpem.then()

    await t2pem.resolve('x')

    await pem.resolve('ok')

    const result = await pem
    const tresult = await tpem

    assert.equal(result, 'ok')
    assert.equal(tresult, 'ok+ok')
  }

  /** emit не должен ничего возвращать, ни чейнится */
  async ['PromiseEventEmitter - emit не возвращает результат']() {
    const em = new PromiseEventEmitter()
    let value = 0

    em.on('test', () => value++)

    const p = em.emit('test')
    const result = await p

    assert(em instanceof PromiseEventEmitter)
    assert(!(p instanceof PromiseEventEmitter))
    assert(result === undefined)
    assert.equal(value, 1)
  }

  /** Ошибки как и с Promise можно перехватывать через try/catch */
  async ['PromiseEventEmitter - перехват ошибок']() {
    const pem = new PromiseEventEmitter()
    let error = null

    await pem.reject('error')

    try {
      await pem
    } catch (err) {
      error = err
    }

    assert.equal(error, 'error')
  }

}
