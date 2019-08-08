/** @module @ndk/test */
'use strict'


/**
 * @param {Set<string>} tests
 * @param {Test} instance
 */
function getOwnClassMethods(tests, instance) {
  const { __proto__ } = instance
  const classMethods = Object.getOwnPropertyNames(__proto__)

  classMethods.forEach(name => {
    const { value } = Object.getOwnPropertyDescriptor(__proto__, name)
    const isFunction = typeof value === 'function'
    const isTestClass = Object.isPrototypeOf.call(Test, value)
    const isTestInstance = value instanceof Test

    if (isFunction && !isTestClass || isTestInstance) {
      tests.add(name)
    }
  })
}

/**
 * @param {Set<string>} tests
 * @param {Test} instance
 */
function getClassMethods(tests, instance) {
  const { __proto__ } = instance

  getOwnClassMethods(tests, instance)
  if (__proto__.__proto__ instanceof Test) {
    getClassMethods(tests, __proto__)
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
  let curentInstanse = instance.__proto__

  while (curentInstanse instanceof Test) {
    const curentStaticTests = new Set()

    getOwnNestedStaticTests(curentStaticTests, curentInstanse.constructor)
    if (curentStaticTests.size > 0) {
      const curentClassMethods = new Set()

      getOwnClassMethods(curentClassMethods, curentInstanse)
      for (const staticTest of curentStaticTests) {
        if (!curentClassMethods.has(staticTest)) {
          tests.set(staticTest, curentInstanse.constructor[staticTest])
        }
      }
    }
    curentInstanse = curentInstanse.constructor.__proto__
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

    getClassMethods(tests, this)
    getNestedStaticTests(tests, this.constructor)
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
