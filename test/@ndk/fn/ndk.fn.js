'use strict'

const { Test, assert } = require('@ndk/test')


exports['@ndk/fn'] = class FnTest extends Test {

  /** Проверка вариантов импорта */
  ['Импорт модуля']() {
    assert(require('@ndk/fn').events === require('@ndk/fn/events'))
  }

}


Object.assign(exports,
  require('./events')
)
