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

  /** once - аналогичен базовому во встроенном модуле events,
   * но работает только с Promise */
  async ['EventEmitter - once']() {
    const em = new EventEmitter()
    const p = new Promise(resolve => setTimeout(() => {
      em.emit('test', 1, 12)
      setTimeout(() => {
        resolve(2)
      }, 1)
    }, 1))
    const [result1, result12] = await em.once('test')
    const result2 = await p

    assert.equal(result1, 1)
    assert.equal(result12, 12)
    assert.equal(result2, 2)
    assert(!(em.has('test')))
  }

  /** on и once можно использовать вместе, при этом события из on не очищаются */
  async ['EventEmitter - on + once']() {
    let result = 0
    const em = new EventEmitter()
    const p = new Promise(resolve => setTimeout(() => {
      em.emit('test', 1)
      setTimeout(() => {
        resolve(2)
      }, 1)
    }, 1))

    em.on('test', value => {
      result += value
    })

    const [result1] = await em.once('test')
    const result2 = await p

    assert.equal(result1, 1)
    assert.equal(result2, 2)
    assert(em.has('test'))
    assert.equal(result, 1)
    em.emit('test', 1)
    assert.equal(result, 2)
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

  /** executor не может вернуть значение, но может быть асинхронным,
   * чтобы отпустить текущий поток выполнения */
  async ['PromiseEventEmitter - асинхронный executor']() {
    let value = 0
    const pem = new PromiseEventEmitter(async emmiter => {
      await new Promise(resolve => setTimeout(resolve, 1))
      emmiter.resolve(++value + 1)
    })

    assert.equal(value, 0)

    const result = await pem

    assert.equal(result, 2)
    assert.equal(value, 1)
  }

  /** Ошибки в асинхронном executor должны перехватываться через try/catch */
  async ['PromiseEventEmitter - перехват асинхронной ошибки']() {
    const pem = new PromiseEventEmitter(async () => {
      await new Promise(resolve => setTimeout(resolve, 1))
      this.nonExistent()
    })
    let error = null

    try {
      await pem
    } catch (err) {
      error = err.message
    }

    assert.equal(error, 'this.nonExistent is not a function')
  }

  /** Если executor асинхронный, то у него всего 1 аргумент emitter,
   *    а синхронный executor получает методы resolve, reject.
   * Это необходимо для поддержания правильного чейнинга,
   *    т.к. он должен создавать новые экземпляры Promise */
  async ['PromiseEventEmitter - синхронный executor']() {
    const pem = new PromiseEventEmitter((resolve, reject) => {
      assert(typeof resolve === 'function')
      assert(typeof reject === 'function')
      resolve(1)
    })
    const result = await pem

    assert.equal(result, 1)
  }

  /** Ошибки в асинхронном executor должны перехватываться через try/catch */
  async ['PromiseEventEmitter - перехват синхронной ошибки']() {
    const pem = new PromiseEventEmitter((resolve, reject) => {
      reject('test')
    })
    let error = null

    try {
      await pem
    } catch (err) {
      error = err
    }

    assert.equal(error, 'test')
  }

  /** Ошибки в коде синхронного executor должны перехватываться через
   * try/catch на блоке с await для PEE, а не на конструкторе PEE */
  async ['PromiseEventEmitter - перехват синхронной ошибки в коде']() {
    const pem = new PromiseEventEmitter(() => {
      this.nonExistent()
    })
    let error = null

    try {
      await pem
    } catch (err) {
      error = err.message
    }

    assert.equal(error, 'this.nonExistent is not a function')
  }

  /** once позволяет организовать обмен между executor'ом и внешним кодом,
   * не создавая при этом лишних callback'ов */
  async ['PromiseEventEmitter - once']() {
    let result2 = 0
    const pem = new PromiseEventEmitter(async emitter => {
      // Код до первого await синхронный, что бы выполнять в этом блоке инициализацию и подписки на события
      await new Promise(resolve => setTimeout(resolve, 1))
      // Отсылать события можно только в асинхронных блоках
      emitter.emit('result1', 1)
      result2 = await emitter.once('result2')
      assert.deepEqual(result2, [2])
      result2 = result2[0] + 1
      emitter.resolve(4)
    })
    const [result1] = await pem.once('result1')

    assert.equal(result1, 1)
    assert.equal(result2, 0)
    pem.emit('result2', 2)
    assert.equal(result2, 0)

    const result3 = await pem

    assert.equal(result2, 3)
    assert.equal(result3, 4)
  }

  /** Внутри PromiseEventEmitter после emit код синхронный, и если он падает,
   * то следующий once завершиться данной ошибкой, а затем и await для PEE завершится данной ошибкой
   */
  async ['PromiseEventEmitter - once, ошибка после emit']() {
    const pem = new PromiseEventEmitter(async (emitter) => {
      await new Promise(resolve => setTimeout(resolve, 1))
      setTimeout(() => {
        emitter.emit('result1', 1)
      }, 1)
      this.nonExistent()
    })
    let error = null

    try {
      await pem.once('result1')
    } catch (err) {
      error = err.message
    }

    assert.equal(error, 'this.nonExistent is not a function')

    try {
      await pem
    } catch (err) {
      error = err.message
    }

    assert.equal(error, 'this.nonExistent is not a function')
  }

  /** Первая ошибка в обработчиках событий завершает Promise с ошибкой */
  async ['PromiseEventEmitter - emit, ошибка в обработчике']() {
    const pem = new PromiseEventEmitter(async (emitter) => {
      await new Promise(resolve => setTimeout(resolve, 1))
      pem.emit('test', 'test')
    })
    let error = null

    pem.on('test', async (test) => {
      await new Promise(resolve => setTimeout(resolve, 1))
      assert.equal(test, 'test')
      this.nonExistent()
    })

    try {
      await pem
    } catch (err) {
      error = err.message
    }

    assert.equal(error, 'this.nonExistent is not a function')
  }

  /** Проверяем, что можно обмениваться данными в асинхронном режиме
   * между основным и дочерним исполнением кода */
  async ['PromiseEventEmitter - once + emit, принял, обработал, отдал']() {
    let result2 = 0
    const pem = new PromiseEventEmitter(async (emitter) => {
      await new Promise(resolve => setTimeout(resolve, 1))
      emitter.emit('result1', 1, 'test')
      result2 = await emitter.once('result2')
      emitter.resolve(result2[0] + 1)
    })
    const result1 = await pem.once('result1')

    pem.emit('result2', result1[0] + 1)

    const result3 = await pem

    assert.deepEqual(result1, [1, 'test'])
    assert.deepEqual(result2, [2])
    assert.equal(result3, 3)
  }

  /** Если в событиях PEE возникает ошибка, то все последующие асинхронные действия завершаться этой ошибкой.
   * emit - не отправит событие и упадет с ошибкой возникшей ранее
   * once - не создаст новой подписки и упадет с ошибкой возникшей ранее */
}
