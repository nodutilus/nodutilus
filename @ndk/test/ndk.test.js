/** @module @ndk/test */
'use strict'


function getClassMethods(tests, instance) {
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

  if (__proto__.__proto__ instanceof Test) {
    getClassMethods(tests, __proto__)
  }
}


function getNestedStaticTests(tests, constructor) {
  const nestedStaticTests = Object.getOwnPropertyNames(constructor)

  nestedStaticTests.forEach(name => {
    const { value } = Object.getOwnPropertyDescriptor(constructor, name)
    const isTestClass = Object.isPrototypeOf.call(Test, value)

    if (isTestClass) {
      tests.add(name)
    }
  })

  if (Object.isPrototypeOf.call(Test, constructor.__proto__)) {
    getNestedStaticTests(tests, constructor.__proto__)
  }
}


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

  constructor() {
    this.report = {}
  }

  success(testName) {
    this.report[testName] = { success: true }
  }

  failure(testName, error) {
    this.report[testName] = { success: false, error }
  }

}


class Test {

  get tests() {
    const tests = new Set()

    getClassMethods(tests, this)
    getNestedStaticTests(tests, this.constructor)
    getInstanceTests(tests, this)

    return tests
  }

  static async run(testInstance) {
    const { tests } = testInstance
    const testReporter = new TestReporter()

    for (const testName of tests) {
      try {
        await testInstance[testName]()
        testReporter.success(testName)
      } catch (error) {
        testReporter.failure(testName, error)
      }
    }
  }

}


exports.Test = Test
