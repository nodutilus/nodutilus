/** @module @ndk/test */
'use strict'

const { strict: assert } = require('assert')
const { EventEmitter } = require('@ndk/fn/events')


/**
 * @param {Set<string>} tests
 * @param {Test} proto
 */
function getOwnClassMethods(tests, proto) {
  const classMethods = Object.getOwnPropertyNames(proto)

  classMethods.forEach(name => {
    const { value } = Object.getOwnPropertyDescriptor(proto, name)
    const isFunction = typeof value === 'function'
    const isTestClass = Object.isPrototypeOf.call(Test, value)

    if (isFunction && !isTestClass) {
      tests.add(name)
    }
  })
}


/**
 * @param {Set<string>} tests
 * @param {Test} proto
 */
function getClassMethods(tests, proto) {
  getOwnClassMethods(tests, proto)
  if (proto.__proto__ instanceof Test) {
    getClassMethods(tests, proto.__proto__)
  }
}


/**
 * @param {Set<string>} tests
 * @param {Function} constructor
 */
function getOwnNestedStaticTests(tests, constructor) {
  const nestedStaticTests = Object.getOwnPropertyNames(constructor)

  nestedStaticTests.forEach(name => {
    const { value } = Object.getOwnPropertyDescriptor(constructor, name)
    const isTestClass = Object.isPrototypeOf.call(Test, value)

    if (isTestClass) {
      tests.add(name)
    }
  })
}


/**
 * @param {Set<string>} tests
 * @param {Function} constructor
 */
function getNestedStaticTests(tests, constructor) {
  getOwnNestedStaticTests(tests, constructor)
  if (Object.isPrototypeOf.call(Test, constructor.__proto__)) {
    getNestedStaticTests(tests, constructor.__proto__)
  }
}


/**
 * @param {Test} instance
 * @returns {Map<string, typeof Test>}
 */
function getNestedStaticTestsClasses(instance) {
  /** @type {Map<string, typeof Test>} */
  const tests = new Map()
  /** @type {Set<string>} */
  const classMethods = new Set()
  let { __proto__, constructor } = instance

  while (__proto__ instanceof Test) {
    /** @type {Set<string>} */
    const curentStaticTests = new Set()

    getOwnNestedStaticTests(curentStaticTests, constructor)
    getOwnClassMethods(classMethods, __proto__)
    if (curentStaticTests.size > 0) {
      for (const staticTest of curentStaticTests) {
        const notClassMethods = !classMethods.has(staticTest)
        const notExists = !tests.has(staticTest)

        if (notClassMethods && notExists) {
          tests.set(staticTest, constructor[staticTest])
        }
      }
    }
    ({ __proto__: { constructor } } = { __proto__ } = __proto__)
  }

  return tests
}


/**
 * @param {Set<string>} tests
 * @param {Test} instance
 */
function getInstanceTests(tests, instance) {
  const instanceTests = Object.getOwnPropertyNames(instance)

  instanceTests.forEach(name => {
    const { value } = Object.getOwnPropertyDescriptor(instance, name)
    const isFunction = typeof value === 'function'
    const isTestClass = Object.isPrototypeOf.call(Test, value)
    const isTestInstance = value instanceof Test

    if (isFunction && !isTestClass || isTestInstance) {
      tests.add(name)
    } else {
      tests.delete(name)
    }
  })
}


class TestResult {

  /**
   * @typedef {object} TestResultOptions
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
      /** @type {Map.<string, TestResult>} */
      this.tests = new Map()
    }
  }

}


/**
 * @param {{testInstance:Test, name:string, test:Test, deepEvents:Array<symbol>}} optioms
 * @param {Function} fn
 * @returns {TestResult}
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
      test.event.delete(event, wrapper)
    })
  } else {
    result = await fn()
  }

  return result
}


/**
 * @typedef {object} EventData
 * @property {Test} instance
 * @property {Array<string>} [path]
 * @property {string} [name]
 * @property {TestResult} [result]
 */
/**
 * @param {Test} testInstance
 * @param {symbol} event
 * @param {EventData} data
 */
async function __notify(testInstance, event, data = {}) {
  /** @type {EventEmitter} */
  const events = testInstance[Test.events]

  if (events) {
    data.instance = testInstance
    await events.emit(event, data)
  }
}


class Test {

  /**
   * @returns {Test}
   */
  constructor() {
    const tests = getNestedStaticTestsClasses(this)

    for (const [name, testClass] of tests) {
      this[name] = new testClass()
    }
  }

  /**
   * @returns {Set<string>}
   */
  get tests() {
    const tests = new Set()
    const { __proto__, constructor } = this

    if (__proto__ instanceof Test) {
      getClassMethods(tests, __proto__)
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
   * @returns {TestResult}
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
      }, async () => await this.run(test))
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
   * @returns {TestResult}
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
Test.before = Symbol('Test#event:before')
Test.after = Symbol('Test#event:after')
Test.beforeEach = Symbol('Test#event:beforeEach')
Test.afterEach = Symbol('Test#event:afterEach')
Test.beforeEachDeep = Symbol('Test#event:beforeEachDeep')
Test.afterEachDeep = Symbol('Test#event:afterEachDeep')
Test.beforeEachNested = Symbol('Test#event:beforeEachNested')
Test.afterEachNested = Symbol('Test#event:afterEachNested')


exports.assert = assert
exports.Test = Test
