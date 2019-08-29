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


class MyTestReturnTest extends Test {

  async myTest1() {
    return await Test.run(new MyTestName())
  }

  myTest2() {
    return Test.run(new MyTestName())
  }

}


class TestEvents extends Test {

  constructor() {
    super()
    this.testNested3 = new Test()
  }

  baseTest1() {}

  baseTest2() {
    equal(this.beforeEach, true)
  }

}


class TestOrder1 extends Test {

  constructor() {
    super()
    this.test5 = new Test()
  }

  test2() {}

}


TestOrder1.test4 = MyTestName


class TestOrder2 extends TestOrder1 {

  constructor() {
    super()
    this.test6 = new Test()
    this.test7 = () => {}
  }

  test1() {}

}


TestOrder2.test3 = MyTestName


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

  async ['Test => return TestResult']() {
    const mt = new MyTestReturnTest()
    const result = await Test.run(mt)
    const myTest1 = result.tests.get('myTest1')
    const myTest2 = result.tests.get('myTest2')
    const baseTest1 = myTest1.tests.get('baseTest')
    const baseTest2 = myTest2.tests.get('baseTest')

    equal(result.success, true)
    equal(myTest1.success, true)
    equal(myTest2.success, true)
    equal(baseTest1.success, true)
    equal(baseTest2.success, true)
  }

  async ['Test => dynamic test from Test']() {
    const dtm = new Test()

    dtm.myTest = () => {}

    const { tests } = dtm
    const result = await Test.run(dtm)
    const myTest = result.tests.get('myTest')

    deepEqual(Array.from(tests), ['myTest'])
    equal(result.success, true)
    equal(result.tests.size, 1)
    equal(myTest.success, true)
  }

  async ['Test => TestEvents']() {
    const mt = new TestEvents()
    const tests = []

    equal(TestEvents.events in mt, false)

    mt.event.on(Test.beforeEach, async ({ instance }) => {
      await new Promise(resolve => setTimeout(resolve, 1))
      instance.beforeEach = true
    })
    mt.event
      .on(Test.before, ({ name }) => { tests.push(name) })
      .on(Test.after, ({ name }) => { tests.push(name) })
      .on(Test.beforeNested, ({ name }) => { tests.push(name) })
      .on(Test.afterNested, ({ name }) => { tests.push(name) })
      .on(Test.afterEach, ({ instance }) => { instance.beforeEach = false })
      .on(Test.afterEach, ({ instance }) => { equal(instance.beforeEach, false) })

    equal(TestEvents.events in mt, true)
    equal(mt.beforeEach, undefined)

    const result = await Test.run(mt)

    equal(mt.beforeEach, false)
    equal(result.success, true)
    deepEqual(tests, ['baseTest1', 'baseTest1', 'baseTest2', 'baseTest2', 'testNested3', 'testNested3'])
  }

  async ['Test => TestOrder1']() {
    const mt = new TestOrder1()
    const { tests } = mt
    const result = await Test.run(mt)

    deepEqual(Array.from(tests), ['test2', 'test4', 'test5'])
    equal(result.success, true)
  }

  async ['Test => TestOrder2']() {
    const mt = new TestOrder2()
    const { tests } = mt
    const result = await Test.run(mt)

    deepEqual(Array.from(tests), ['test1', 'test2', 'test3', 'test4', 'test5', 'test6', 'test7'])
    equal(result.success, true)
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
