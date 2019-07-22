/** @module @ndk/test */

class Test {

  constructor() {
    this.name = this.constructor.name
  }

  static _getTests() {
    const { prototype, __proto__ } = this
    const clsTests = Object.getOwnPropertyNames(prototype).filter(name => {
      const isFn = typeof prototype[name] === 'function'
      const isProtect = name.startsWith('_')
      const isConstructor = name === 'constructor'

      return isFn && !isProtect && !isConstructor
    })
    const prtTests = __proto__ === Test ? [] : __proto__._getTests()

    return new Set([...clsTests, ...prtTests])
  }

  _getTests() {
    const ownTests = Object.getOwnPropertyNames(this).filter(name => {
      const isFn = typeof this[name] === 'function'
      const isProtect = name.startsWith('_')

      return isFn && !isProtect
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
