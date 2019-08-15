/** @module @ndk/test */
'use strict'


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
 *
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


class TestReporter {

  /**
   * @typedef {object} TestResult
   * @property {boolean} success
   * @property {Map.<string, TestResult>} [tests]
   * @property {Error} [error]
   */
  /** */
  constructor() {
    /** @type {TestResult} */
    this.report = { tests: new Map(), success: true }
  }

  /**
   * @param {string} testName
   */
  success(testName) {
    this.report.tests.set(testName, { success: true })
  }

  /**
   * @param {string} testName
   * @param {Error} error
   */
  failure(testName, error) {
    this.report.tests.set(testName, { success: false, error })
    this.report.success = false
  }

  /**
   * @param {string} testName
   * @param {TestResult} testResult
   */
  nested(testName, testResult) {
    this.report.tests.set(testName, testResult)
    this.report.success = this.report.success && testResult.success
  }

}


class Test {

  /**
   * @returns {Test}
   */
  constructor() {
    const tests = getNestedStaticTestsClasses(this)

    for (const [testName, testClass] of tests) {
      this[testName] = new testClass()
    }
  }

  /**
   * @returns {Set<string>}
   */
  get tests() {
    const tests = new Set()
    const { __proto__, constructor } = this

    getClassMethods(tests, __proto__)
    getNestedStaticTests(tests, constructor)
    getInstanceTests(tests, this)

    return tests
  }

  /**
   * @param {Test} testInstance
   * @returns {TestResult}
   */
  static async run(testInstance) {
    const { tests } = testInstance
    const testReporter = new TestReporter()

    for (const testName of tests) {
      const test = testInstance[testName]

      if (test instanceof Test) {
        testReporter.nested(testName, await this.run(test))
      } else {
        try {
          await test()
          testReporter.success(testName)
        } catch (error) {
          testReporter.failure(testName, error)
        }
      }
    }

    return testReporter.report
  }

}


exports.Test = Test
