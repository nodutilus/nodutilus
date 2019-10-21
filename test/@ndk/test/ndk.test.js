'use strict'

const { Test, TestResult, assert } = require('@ndk/test')

exports['@ndk/test'] = class TestTest extends Test {

  /** Тесты можно расширять через наследование классов */
  async ['Test - наследование тестов']() {
    class TestA extends Test {

      /***/
      testA() {}

      /***/
      testC() {}

    }

    class TestB extends TestA {

      /***/
      testB() {}

      /** При наследовании можно затереть тест, что бы он не выполнялся
       *
       * @returns {number}
       */
      get testC() { return 1 }

      /***/
      testD() { throw new Error('test') }

    }

    const test = new TestB()
    const result = await Test.run(test)

    assert.equal(result.success, false)
    assert.equal(result.tests.get('testA').success, true)
    assert.equal(result.tests.get('testB').success, true)
    assert.equal(result.tests.get('testC'), undefined)
    assert.equal(result.tests.get('testD').success, false)
    assert.equal(result.tests.get('testD').error.message, 'test')
    assert.equal(test.testC, 1)
    assert.doesNotThrow(TestA.prototype.testC)
  }

  /** События наследуются вместе с тестами */
  async ['Test - наследование событий тестов']() {
    const tests = []

    class TestA extends Test {

      /***/
      [Test.before]() {
        tests.push('init')
      }

      /**
       * @param {{name:string}} name
       */
      [Test.beforeEach]({ name }) {
        tests.push(name)
      }

      /**
       * События объявленные через getter не учитываются
       *
       * @returns {void}
       */
      get [Test.afterEach]() {
        return (() => {
          tests.push('throw')
          throw new Error('test')
        })()
      }

      /***/
      testA() {}

    }

    class TestB extends TestA {

      /***/
      testB() {}

    }

    // Пока нет полей классов события можно отключить через прототип
    TestB.prototype[Test.before] = null

    const test = new TestB()
    const result = await Test.run(test)

    assert.equal(result.success, true)
    assert.equal(result.tests.get('testA').success, true)
    assert.equal(result.tests.get('testB').success, true)
    assert.deepEqual(tests, ['testA', 'testB'])
    // Проверим что событие есть, но не выполнялось
    assert.throws(() => test[Test.afterEach](), { message: 'test' })
    assert.deepEqual(tests, ['testA', 'testB', 'throw'])
    assert.doesNotThrow(TestA.prototype[Test.before])
    assert.deepEqual(tests, ['testA', 'testB', 'throw', 'init'])
  }

  /** Тесты можно агрегировать, указывая как статические члены другого класса.
   *  Пока нет полей класса, задаются после объявления класса.
   * (https://github.com/tc39/proposal-class-fields) */
  async ['Test - агрегация тестов']() {
    class TestA extends Test {

      /***/
      testA() {}

    }

    class TestB extends Test {

      /***/
      testB() {}

    }

    TestB.TestE = TestA

    class TestC extends Test {}

    TestC.TestA = TestA
    TestC.TestB = TestB
    TestC.TestF = TestB
    // Агрегируются классы тестов, но не их экземпляры
    TestC.TestD = new TestB()

    class TestE extends TestC {

      /** */
      constructor() {
        super()
        // Также можно затереть тест в конструкции наследника агрегации
        // Значение может быть любым отличным от наследника Test
        this.TestB = 1
        // В конструкторе не добавить тестовые классы, они игнорируются, можно толоко готовые экземпляры
        this.TestG = TestA
      }

      /** Агрегацию можно выполнить внутри теста, вернув из него результат другого теста
       *
       * @returns {TestResult}
       */
      async testH() {
        const result = await Test.run(new TestA())

        assert(result instanceof TestResult)

        return result
      }

    }

    // Можно наследоваться от агрегации и переопределить её тесты
    TestE.TestA = TestB
    TestE.TestD = TestB
    // Также можно затереть тест при наследовании их агрегации
    // Значение может быть любым отличным от наследника Test
    TestE.TestF = 1

    const resultC = await Test.run(new TestC())
    const resultE = await Test.run(new TestE())

    assert.equal(resultC.success, true)
    assert.equal(resultC.tests.get('TestA').tests.get('testA').success, true)
    assert.equal(resultC.tests.get('TestB').tests.get('testB').success, true)
    assert.equal(resultC.tests.get('TestD'), undefined)
    assert.equal(resultC.tests.get('TestF').tests.get('testB').success, true)

    assert.equal(resultE.tests.get('TestA').tests.get('testB').success, true)
    assert.equal(resultE.tests.get('TestD').tests.get('testB').success, true)
    assert.equal(resultE.tests.get('TestB'), undefined)
    assert.equal(resultE.tests.get('TestF'), undefined)
    assert.equal(resultE.tests.get('TestG'), undefined)
    assert.equal(resultE.tests.get('testH').tests.get('testA').success, true)
  }

  /** Тесты можно создавать и без объявления классов, просто расширяя экземпляр Test */
  async ['Test - тесты без объявления класса']() {
    const testA = new Test()
    const testB = new Test()

    testA.test = () => {}
    testB.testC = () => {}
    testB.testA = testA

    const result = await Test.run(testB)

    assert.equal(result.success, true)
    assert.equal(result.tests.get('testA').success, true)
    assert.equal(result.tests.get('testA').tests.get('test').success, true)
    assert.equal(result.tests.get('testC').success, true)
  }

}
