'use strict'

const { Test, assert } = require('@nodutilus/test')


exports['@nodutilus/fn'] = class FnTest extends Test {

  /** Проверка вариантов импорта */
  ['Импорт модуля']() {
    assert(require('@nodutilus/fn').events === require('@nodutilus/fn/events'))
  }

}


Object.assign(exports,
  require('./events')
)
