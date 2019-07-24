/** @module @ndk/test */

class Test {

  get name() {
    return this.constructor.name
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
