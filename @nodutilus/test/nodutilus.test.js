/** @module @nodutilus/test */

import { EventEmitter } from '@nodutilus/events'

const { strict: assert } = require('assert')


const baseEvents = {
  before: Symbol('Test#event:before'),
  after: Symbol('Test#event:after'),
  beforeEach: Symbol('Test#event:beforeEach'),
  afterEach: Symbol('Test#event:afterEach'),
  beforeEachDeep: Symbol('Test#event:beforeEachDeep'),
  afterEachDeep: Symbol('Test#event:afterEachDeep'),
  beforeEachNested: Symbol('Test#event:beforeEachNested'),
  afterEachNested: Symbol('Test#event:afterEachNested')
}
const baseEventsList = Object.values(baseEvents)


/**
 * @param {Set<string>} tests
 * @param {Test} proto
 */
function getOwnClassMethods(tests, proto) {
  const classMethods = Object.getOwnPropertyNames(proto)

  classMethods.forEach(name => {
    const { value } = Reflect.getOwnPropertyDescriptor(proto, name)
    const isFunction = typeof value === 'function'
    const isTestClass = Object.isPrototypeOf.call(Test, value)

    if (isFunction && !isTestClass) {
      tests.add(name)
    } else if (tests.has(name)) {
      tests.delete(name)
    }
  })
}


/**
 * @param {Set<string>} tests
 * @param {Test} proto
 */
function getClassMethods(tests, proto) {
  const nestedProto = Reflect.getPrototypeOf(proto)

  if (nestedProto instanceof Test) {
    getClassMethods(tests, nestedProto)
  }
  getOwnClassMethods(tests, proto)
}


/**
 * @typedef {Map<symbol, function(EventData)>} EventListeners
 */
/**
 * @param {EventListeners} events
 * @param {Test} proto
 */
function getOwnClassEvents(events, proto) {
  const classEvents = Object.getOwnPropertySymbols(proto)

  classEvents.forEach(event => {
    const { value } = Reflect.getOwnPropertyDescriptor(proto, event)
    const isEvent = baseEventsList.includes(event)
    const isFunction = typeof value === 'function'

    if (isEvent && isFunction) {
      events.set(event, value)
    } else if (events.has(event)) {
      events.delete(event)
    }
  })
}


/**
 * @param {EventListeners} events
 * @param {Test} proto
 * @returns {EventListeners}
 */
function getClassEvents(events, proto) {
  const nestedProto = Reflect.getPrototypeOf(proto)

  if (nestedProto instanceof Test) {
    getClassEvents(events, nestedProto)
  }
  getOwnClassEvents(events, proto)

  return events
}


/**
 * @param {Set<string>} tests
 * @param {Function} constructor
 */
function getOwnNestedStaticTests(tests, constructor) {
  const nestedStaticTests = Object.getOwnPropertyNames(constructor)

  nestedStaticTests.forEach(name => {
    const { value } = Reflect.getOwnPropertyDescriptor(constructor, name)
    const isTestClass = Object.isPrototypeOf.call(Test, value)

    if (isTestClass) {
      tests.add(name)
    } else if (tests.has(name)) {
      tests.delete(name)
    }
  })
}


/**
 * @param {Set<string>} tests
 * @param {Function} constructor
 */
function getNestedStaticTests(tests, constructor) {
  const constructorProto = Reflect.getPrototypeOf(constructor)

  if (Object.isPrototypeOf.call(Test, constructorProto)) {
    getNestedStaticTests(tests, constructorProto)
  }
  getOwnNestedStaticTests(tests, constructor)
}


/**
 * @param {Set<string>} tests
 * @param {Test} proto
 * @returns {Set<string>}
 */
function getOwnResolvedNestedStaticTests(tests, proto) {
  getOwnNestedStaticTests(tests, proto.constructor)

  if (tests.size > 0) {
    const ownPropertyNames = Object.getOwnPropertyNames(proto)

    for (const ownPropertyName of ownPropertyNames) {
      if (tests.has(ownPropertyName)) {
        tests.delete(ownPropertyName)
      }
    }
  }

  return tests
}

/**
 * @param {Set<string>} tests
 * @param {Test} proto
 * @returns {Set<string>}
 */
function getResolvedNestedStaticTests(tests, proto) {
  const nestedProto = Reflect.getPrototypeOf(proto)

  if (nestedProto instanceof Test) {
    getResolvedNestedStaticTests(tests, nestedProto)
  }
  getOwnResolvedNestedStaticTests(tests, proto)

  return tests
}


/**
 * @param {Set<string>} tests
 * @param {Test} instance
 */
function getInstanceTests(tests, instance) {
  const instanceTests = Object.getOwnPropertyNames(instance)

  instanceTests.forEach(name => {
    const { value } = Reflect.getOwnPropertyDescriptor(instance, name)
    const isFunction = typeof value === 'function'
    const isTestClass = Object.isPrototypeOf.call(Test, value)
    const isTestInstance = value instanceof Test

    if ((isFunction && !isTestClass) || isTestInstance) {
      tests.add(name)
    } else {
      tests.delete(name)
    }
  })
}

/**
 * Отчет о результатах тестирования
 */
class TestResult {

  /**
   * @typedef TestResultOptions
   * @property {Error} [error]
   * @property {boolean} [hasNested]
   */
  /**
   * @param {TestResultOptions} options
   */
  constructor({ error, hasNested } = {}) {
    /** @type {boolean} success */
    this.success = true
    if (error) {
      /** @type {Error} */
      this.error = error
      this.success = false
    }
    if (hasNested) {
      /** @type {Map<string, TestResult>} */
      this.tests = new Map()
    }
  }

}


/**
 * @param {{testInstance:Test, name:string, test:Test, deepEvents:Array<symbol>}} optioms
 * @param {Function} fn
 * @returns {Promise<TestResult>}
 */
async function __deepEventsWrapper({ testInstance, name, test, deepEvents }, fn) {
  /** @type {EventEmitter} */
  const events = testInstance[Test.events]
  let result

  if (events) {
    const deepEventsWrapper = deepEvents
      .filter(events.has.bind(events))
      .map(event => [event, data => {
        data.path.unshift(name)
        events.emit(event, data)
      }])

    deepEventsWrapper.forEach(([event, wrapper]) => {
      test.event.on(event, wrapper)
    })

    result = await fn()

    deepEventsWrapper.forEach(([event, wrapper]) => {
      test.event.off(event, wrapper)
    })
  } else {
    result = await fn()
  }

  return result
}


/**
 * @typedef EventData
 * @property {Test} instance
 * @property {Array<string>} [path]
 * @property {string} [name]
 * @property {TestResult} [result]
 */
/**
 * @param {Test} testInstance
 * @param {symbol} event
 * @param {EventData} data
 * @returns {Promise<void>}
 */
async function __notify(testInstance, event, data = {}) {
  /** @type {EventEmitter} */
  const events = testInstance[Test.events]

  if (events) {
    data.instance = testInstance
    await events.emit(event, data)
  }
}

/**
 * Написание тестов в парадигме классов
 */
class Test {

  /**
   * @returns {Test}
   */
  constructor() {
    const proto = Reflect.getPrototypeOf(this)
    const tests = getResolvedNestedStaticTests(new Set(), proto)
    const events = getClassEvents(new Map(), proto)
    const { constructor } = this

    for (const name of tests) {
      this[name] = new constructor[name]()
    }
    for (const [event, listener] of events) {
      this.event.on(event, listener.bind(this))
    }
  }

  /**
   * @returns {Set<string>}
   */
  get tests() {
    const tests = new Set()
    const proto = Reflect.getPrototypeOf(this)
    const { constructor } = this

    if (proto instanceof Test) {
      getClassMethods(tests, proto)
      getNestedStaticTests(tests, constructor)
    }
    getInstanceTests(tests, this)

    return tests
  }

  /**
   * @returns {EventEmitter}
   */
  get event() {
    if (!(Test.events in this)) {
      this[Test.events] = new EventEmitter()
    }

    return this[Test.events]
  }

  /**
   * @param {Test} testInstance
   * @param {string} name
   * @returns {Promise<TestResult>}
   */
  static async runTest(testInstance, name) {
    const test = testInstance[name]
    let result

    if (test instanceof Test) {
      await __notify(testInstance, Test.beforeEachNested, { name })
      result = await __deepEventsWrapper({
        testInstance,
        name,
        test,
        deepEvents: [Test.beforeEachDeep, Test.afterEachDeep]
      }, async () => {
        const testResult = await this.run(test)

        return testResult
      })
      await __notify(testInstance, Test.afterEachNested, { name, result })
    } else {
      await __notify(testInstance, Test.beforeEach, { name })
      await __notify(testInstance, Test.beforeEachDeep, { path: [], name })
      try {
        const testResult = await Reflect.apply(test, testInstance, [])

        if (testResult instanceof TestResult) {
          result = testResult
        } else {
          result = new TestResult()
        }
      } catch (error) {
        result = new TestResult({ error })
      }
      await __notify(testInstance, Test.afterEach, { name, result })
      await __notify(testInstance, Test.afterEachDeep, { path: [], name, result })
    }

    return result
  }

  /**
   * @param {Test} testInstance
   * @returns {Promise<TestResult>}
   */
  static async run(testInstance) {
    const { tests } = testInstance
    const result = new TestResult({ hasNested: true })

    await __notify(testInstance, Test.before)

    for (const name of tests) {
      const testResult = await this.runTest(testInstance, name)

      result.tests.set(name, testResult)
      result.success = result.success && testResult.success
    }

    await __notify(testInstance, Test.after, { result })

    return result
  }

}


Test.events = Symbol('Test~events')
Test.before = baseEvents.before
Test.after = baseEvents.after
Test.beforeEach = baseEvents.beforeEach
Test.afterEach = baseEvents.afterEach
Test.beforeEachDeep = baseEvents.beforeEachDeep
Test.afterEachDeep = baseEvents.afterEachDeep
Test.beforeEachNested = baseEvents.beforeEachNested
Test.afterEachNested = baseEvents.afterEachNested


exports.assert = assert
exports.Test = Test
exports.TestResult = TestResult
