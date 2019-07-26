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


function getNestedStaticTests(tests, instance) {}


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


class Test {

  get name() {
    return this.constructor.name
  }

  get tests() {
    const tests = new Set()

    getClassMethods(tests, this)
    getNestedStaticTests(tests, this)
    getInstanceTests(tests, this)

    return tests
  }

  static _getTests() {
    const { prototype, __proto__ } = this
    const clsTests = Object.getOwnPropertyNames(prototype).filter(name => {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, name)
      const isFn = typeof descriptor.value === 'function'
      const isProtect = name.startsWith('_')
      const isConstructor = name === 'constructor'

      return isFn && !isProtect && !isConstructor
    })
    const prtTests = __proto__ === Test ? [] : __proto__._getTests()
    const tests = new Set([...clsTests, ...prtTests])

    return tests
  }

  _getTests() {
    const ownTests = Object.getOwnPropertyNames(this).filter(name => {
      const descriptor = Object.getOwnPropertyDescriptor(this, name)
      const isFn = typeof descriptor.value === 'function'
      const isProtect = name.startsWith('_')
      const isTestClass = Object.isPrototypeOf.call(Test, descriptor.value)
      const isTestInstance = descriptor.value instanceof Test

      return isFn && !isProtect && !isTestClass || isTestInstance
    })
    const clsTests = this.constructor._getTests()
    const tests = new Set([...ownTests, ...clsTests])

    return tests
  }

  async run() {
    console.log(this)
  }

}

Object.assign(exports, {
  Test
})
