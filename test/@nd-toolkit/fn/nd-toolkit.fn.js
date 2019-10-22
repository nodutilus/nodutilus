'use strict'

const { Test, assert } = require('@nd-toolkit/test')


exports['@nd-toolkit/fn'] = class FnTest extends Test {

  /** Проверка вариантов импорта */
  ['Импорт модуля']() {
    assert(require('@nd-toolkit/fn').events === require('@nd-toolkit/fn/events'))
  }

}


Object.assign(exports,
  require('./events')
)
