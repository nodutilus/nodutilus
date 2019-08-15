'use strict'

const { strict: assert } = require('assert')
const { Test } = require('@ndk/test')

const { ok, equal, deepEqual, throws, doesNotThrow } = assert


class MyTestName extends Test {

  baseTest() {}

  static notTest1() {}

  get notTest2() {
    return () => {}
  }

  get notTest3() {
    return new class Mtest extends Test {}()
  }

}


class MyTestFailure extends Test {

  baseTest() { throw new Error('Test Error') }

}


class MyTestConstructor extends Test {

  constructor() {
    super()
    this.myTest = () => {}
    this.notTest = MyTestName
    this.mySubTest = new MyTestName()
    this.sizeBeforeRedefined = this.tests.size
    this.muOpt = 123
  }

  notTest() {}

}


MyTestConstructor.muOpt = MyTestName


class MyTestConstructorFailure extends Test {

  constructor() {
    super()
    this.myTest = () => {}
    this.mySubTest = new MyTestFailure()
  }

}


class MyTestNameInclude extends Test {}


MyTestNameInclude.include = MyTestName
MyTestNameInclude.notTest = new MyTestName()


class MyTestNameIncludeFailure extends MyTestNameInclude {}


MyTestNameIncludeFailure.include = MyTestFailure


class MyTestNameIncludeExtends extends MyTestNameIncludeFailure {}


MyTestNameIncludeExtends.includeExt = MyTestName


class MyTestNameIncludeRedefine extends Test {

  include() {}

}


MyTestNameIncludeRedefine.include = MyTestFailure


class MyTestNameIncludeRedefineExt0 extends Test {

  includeExt() { throw new Error('Test Error') }

}


MyTestNameIncludeRedefineExt0.include = MyTestFailure


class MyTestNameIncludeRedefineExt extends MyTestNameIncludeRedefineExt0 {

  include() {}

}


MyTestNameIncludeRedefineExt.includeExt = MyTestName


class MyTestNameExt extends MyTestName {

  baseTestExt() {}

}


class MyTestConstructorExt extends MyTestConstructor {

  constructor() {
    super()
    this.myTest2 = () => {}
  }

}


class MyTestNameIncludeExt extends MyTestNameInclude {}


MyTestNameIncludeExt.includeExt = MyTestName


class allTests {

  ['Test => getClassMethods']() {
    const mt = new MyTestName()
    const { tests } = mt

    deepEqual(Array.from(tests), ['baseTest'])
    doesNotThrow(mt.baseTest)
    doesNotThrow(MyTestName.notTest1)
    doesNotThrow(mt.notTest2)
    ok(mt.notTest3 instanceof Test)
  }

  ['Test => getClassMethods extends']() {
    const mt = new MyTestNameExt()
    const { tests } = mt

    deepEqual(Array.from(tests), ['baseTestExt', 'baseTest'])
    doesNotThrow(mt.baseTestExt)
  }

  ['Test => getInstanceTests']() {
    const mt = new MyTestConstructor()
    const { tests } = mt

    deepEqual(Array.from(tests), ['myTest', 'mySubTest'])
    doesNotThrow(mt.myTest)
    ok(mt.mySubTest instanceof Test)
    doesNotThrow(() => ok(new mt.notTest() instanceof Test))
    doesNotThrow(mt.__proto__.notTest)
    equal(mt.sizeBeforeRedefined, 3)
    equal(tests.size, 2)
  }

  ['Test => getInstanceTests extends']() {
    const mt = new MyTestConstructorExt()
    const { tests } = mt

    deepEqual(Array.from(tests), ['myTest', 'mySubTest', 'myTest2'])
    doesNotThrow(mt.myTest)
    doesNotThrow(mt.myTest2)
    ok(mt.mySubTest instanceof Test)
    doesNotThrow(() => ok(new mt.notTest() instanceof Test))
  }

  ['Test => getNestedStaticTests']() {
    const mt = new MyTestNameInclude()
    const { tests } = mt

    deepEqual(Array.from(tests), ['include'])
    doesNotThrow(() => ok(new MyTestNameInclude.include() instanceof Test))
    ok(MyTestNameInclude.notTest instanceof Test)
  }

  ['Test => getNestedStaticTests extends']() {
    const mt = new MyTestNameIncludeExt()
    const { tests } = mt

    deepEqual(Array.from(tests), ['includeExt', 'include'])
    doesNotThrow(() => ok(new MyTestNameIncludeExt.includeExt() instanceof Test))
    doesNotThrow(() => ok(new MyTestNameIncludeExt.include() instanceof Test))
    ok(MyTestNameIncludeExt.notTest instanceof Test)
  }

  async ['Test => run ClassMethods']() {
    const mt = new MyTestName()
    const result = await Test.run(mt)
    const baseTest = result.tests.get('baseTest')

    equal(result.success, true)
    equal(baseTest.success, true)
  }

  async ['Test => run ClassMethods failure']() {
    const mt = new MyTestFailure()
    const result = await Test.run(mt)
    const baseTest = result.tests.get('baseTest')

    equal(result.success, false)
    equal(baseTest.success, false)
    equal(baseTest.error.message, 'Test Error')
  }

  async ['Test => run getInstanceTests']() {
    const mt = new MyTestConstructor()
    const result = await Test.run(mt)
    const myTest = result.tests.get('myTest')
    const mySubTest = result.tests.get('mySubTest')
    const baseTest = mySubTest.tests.get('baseTest')

    equal(result.success, true)
    equal(result.tests.size, 2)
    equal(myTest.success, true)
    equal(mySubTest.success, true)
    equal(baseTest.success, true)
  }

  async ['Test => run getInstanceTests failure']() {
    const mt = new MyTestConstructorFailure()
    const result = await Test.run(mt)
    const myTest = result.tests.get('myTest')
    const mySubTest = result.tests.get('mySubTest')
    const baseTest = mySubTest.tests.get('baseTest')

    equal(result.success, false)
    equal(result.tests.size, 2)
    equal(myTest.success, true)
    equal(mySubTest.success, false)
    equal(baseTest.success, false)
    equal(baseTest.error.message, 'Test Error')
  }

  async ['Test => run getNestedStaticTests']() {
    const mt = new MyTestNameInclude()
    const result = await Test.run(mt)
    const include = result.tests.get('include')
    const baseTest = include.tests.get('baseTest')

    equal(result.success, true)
    equal(result.tests.size, 1)
    equal(include.success, true)
    equal(baseTest.success, true)
  }

  async ['Test => run getNestedStaticTests failure']() {
    const mt = new MyTestNameIncludeFailure()
    const result = await Test.run(mt)
    const include = result.tests.get('include')
    const baseTest = include.tests.get('baseTest')

    equal(result.success, false)
    equal(result.tests.size, 1)
    equal(include.success, false)
    equal(include.tests.size, 1)
    equal(baseTest.success, false)
    equal(baseTest.error.message, 'Test Error')
  }

  async ['Test => run getNestedStaticTests extends']() {
    const mt = new MyTestNameIncludeExtends()
    const result = await Test.run(mt)
    const include = result.tests.get('include')
    const baseTest = include.tests.get('baseTest')
    const includeExt = result.tests.get('includeExt')
    const baseTestExt = includeExt.tests.get('baseTest')

    equal(result.success, false)
    equal(result.tests.size, 2)
    equal(include.success, false)
    equal(include.tests.size, 1)
    equal(baseTest.success, false)
    equal(baseTest.error.message, 'Test Error')
    equal(includeExt.success, true)
    equal(includeExt.tests.size, 1)
    equal(baseTestExt.success, true)
  }

  async ['Test => run getNestedStaticTests redefine']() {
    const mt = new MyTestNameIncludeRedefine()
    const result = await Test.run(mt)
    const include = result.tests.get('include')

    equal(Object.isPrototypeOf.call(Test, MyTestNameIncludeRedefine.include), true)
    equal(typeof mt.include, 'function')
    equal(result.success, true)
    equal(result.tests.size, 1)
    equal(include.success, true)
  }

  async ['Test => run getNestedStaticTests redefine with extends']() {
    const mt = new MyTestNameIncludeRedefineExt()
    const result = await Test.run(mt)
    const include = result.tests.get('include')
    const includeExt = result.tests.get('includeExt')

    equal(Object.isPrototypeOf.call(Test, MyTestNameIncludeRedefineExt.include), true)
    equal(typeof mt.include, 'function')
    equal(mt.includeExt instanceof Test, true)
    equal(result.success, true)
    equal(result.tests.size, 2)
    equal(include.success, true)
    equal(includeExt.success, true)
    equal(includeExt.tests.size, 1)
    throws(mt.__proto__.includeExt, { message: 'Test Error' })
  }

}


async function preparation() {
  const tests = new allTests()
  const testNames = Object.getOwnPropertyNames(tests.__proto__)
    .filter(item => item !== 'constructor')

  for (const testName of testNames) {
    await tests[testName]()
  }
}


exports.preparation = preparation
