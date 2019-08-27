/** @module @ndk/test */
'use strict'

const { EventEmitter } = require('events')


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


class TestReporter {

  /** */
  constructor() {
    this.report = new TestResult({ hasNested: true })
  }

  /**
   * @param {string} name
   */
  success(name) {
    this.report.tests.set(name, new TestResult())
  }

  /**
   * @param {string} name
   * @param {Error} error
   */
  failure(name, error) {
    this.report.tests.set(name, new TestResult({ error }))
    this.report.success = false
  }

  /**
   * @param {string} name
   * @param {TestResult} testResult
   */
  nested(name, testResult) {
    this.report.tests.set(name, testResult)
    this.report.success = this.report.success && testResult.success
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
   * @typedef {object} EventData
   * @property {Test} instance
   * @property {string} name
   */
  /**
   * @param {Test} testInstance
   * @param {string} event https://github.com/gajus/eslint-plugin-jsdoc/pull/371
   * @param {EventData} data
   */
  static notify(testInstance, event, data = {}) {
    /** @type {EventEmitter} */
    const events = testInstance[Test.events]

    if (events) {
      data.instance = testInstance
      events.emit(event, data)
    }
  }

  /**
   * @param {Test} testInstance
   * @returns {TestResult}
   */
  static async run(testInstance) {
    const { tests } = testInstance
    const testReporter = new TestReporter()

    this.notify(testInstance, Test.beforeEach)

    for (const name of tests) {
      const test = testInstance[name]

      if (test instanceof Test) {
        testReporter.nested(name, await this.run(test))
      } else {
        this.notify(testInstance, Test.before, { name })
        try {
          const testResult = await Reflect.apply(test, testInstance, [])

          if (testResult instanceof TestResult) {
            testReporter.nested(name, testResult)
          } else {
            testReporter.success(name)
          }
        } catch (error) {
          testReporter.failure(name, error)
        }
        this.notify(testInstance, Test.after, { name })
      }
    }

    this.notify(testInstance, Test.afterEach)

    return testReporter.report
  }

}

Test.events = Symbol('events')
Test.before = Symbol('event:before')
Test.after = Symbol('event:after')
Test.beforeEach = Symbol('event:beforeEach')
Test.afterEach = Symbol('event:afterEach')


exports.Test = Test
