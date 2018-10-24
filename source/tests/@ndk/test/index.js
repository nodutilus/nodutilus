'use strict';

const { strict: assert } = require('assert');
const { resolve } = require('path');
const { spawnSync } = require('child_process');

const { Test, createTest } = require('@ndk/test');


class SimpleClass extends Test {

  get testData() {
    return 'it is test data';
  }

  testMyFn() {}

  ['test: Мой тест']() {}

  async testThrow() {
    await new Promise((r, reject) => setTimeout(() => {
      reject(new Error('TEST ERROR'));
    }, 10));
  }

}


class AggregateClass extends Test {

  get testAggregateClass() {
    return SimpleClass;
  }

}


class InheritClass extends SimpleClass {

  testThrow() {}

}


class InheritAndAggregateClass extends SimpleClass {

  testThrow() { throw new Error('TEST ERROR'); }

  get testInheritAndAggregateClass() {
    return SimpleClass;
  }

}


const CustomTestClass = createTest('CustomTestClass', {
  testSimpleClass: SimpleClass,
  testAggregateClass: AggregateClass,
  testInheritClass: InheritClass,
  testInheritAndAggregateClass: InheritAndAggregateClass
});


class NDKTest extends Test {

  get name() {
    return '@ndk/test';
  }

  async ['test: SimpleClass']() {
    assert.equal(new SimpleClass().testData, 'it is test data');
    let ownNamas = SimpleClass.getOwnTestNames();
    let namas = SimpleClass.getTestNames();
    let expectedNames = ['testMyFn', 'test: Мой тест', 'testThrow'];
    assert.deepEqual(ownNamas, namas);
    assert.deepEqual(namas, expectedNames);
    let simple = new SimpleClass();
    assert.equal(simple.name, 'SimpleClass');
    let runError = null;
    let promise = new Promise((resolve, reject) => {
      let timeout = setTimeout(() => {
        reject(new Error('TIMEOUT'));
      }, 100);
      simple.on('error', (cls, testName, result) => {
        runError = result.error;
        assert.equal(result.error.message, 'TEST ERROR');
        clearTimeout(timeout);
        resolve();
      });
    });
    let result = await simple.run();
    assert.equal(result.type, 'class');
    assert.equal(typeof result.timeline, 'object');
    assert.equal(result.success, false);
    assert.equal(result.done, 2);
    assert.equal(result.fail, 1);
    assert.equal(result.ignore, 0);
    assert.equal(result.total, 3);
    assert.equal(result.total, SimpleClass.getTestLength());
    assert.equal(result.total, result.done + result.fail + result.ignore);
    assert.equal(result.items['test: Мой тест'].type, 'function');
    assert.equal(typeof result.items['test: Мой тест'].timeline, 'object');
    assert.equal(result.items['test: Мой тест'].success, true);
    assert.equal(result.items.testMyFn.success, true);
    assert.equal(result.items.testThrow.success, false);
    await promise;
    assert.equal(runError, result.items.testThrow.error);
  }

  async ['test: AggregateClass']() {
    let namas = AggregateClass.getTestNames();
    let recursiveNames = AggregateClass.getRecursiveTestNames();
    let expectedRecursiveNames = [
      'testAggregateClass.testMyFn',
      'testAggregateClass.test: Мой тест',
      'testAggregateClass.testThrow'
    ];
    assert.deepEqual(namas, ['testAggregateClass']);
    assert.deepEqual(recursiveNames, expectedRecursiveNames);
    let aggregate = new AggregateClass();
    let promise = new Promise((resolve, reject) => {
      let timeout = setTimeout(() => {
        reject(new Error('TIMEOUT'));
      }, 100);
      aggregate.on('error', (cls, testName, result) => {
        assert.equal(result.error.message, 'TEST ERROR');
        clearTimeout(timeout);
        resolve();
      });
    });
    let result = await aggregate.run();
    await promise;
    assert.equal(result.success, false);
    assert.equal(result.done, 2);
    assert.equal(result.fail, 1);
    assert.equal(result.ignore, 0);
    assert.equal(result.total, 3);
    assert.equal(result.total, AggregateClass.getTestLength());
    assert.equal(result.total, result.done + result.fail + result.ignore);
    assert.equal(typeof result.items, 'object');
    assert.equal(result.items.testAggregateClass.type, 'class');
    assert.equal(result.items.testAggregateClass.success, false);
    assert.equal(result.items.testAggregateClass.success, result.success);
    assert.equal(result.items.testAggregateClass.done, result.done);
    assert.equal(result.items.testAggregateClass.fail, result.fail, 1);
    assert.equal(result.items.testAggregateClass.ignore, result.ignore, 0);
    assert.equal(result.items.testAggregateClass.total, result.total);
    assert.equal(typeof result.items.testAggregateClass.items, 'object');
    const tests = result.items.testAggregateClass.items;
    assert.equal(tests['test: Мой тест'].type, 'function');
    assert.equal(tests['test: Мой тест'].success, true);
    assert.equal(tests.testMyFn.success, true);
    assert.equal(tests.testThrow.success, false);
  }

  async ['test: InheritClass']() {
    let ownNamas = InheritClass.getOwnTestNames();
    let namas = InheritClass.getTestNames();
    let expectedOwnNames = ['testThrow'];
    let expectedNames = ['testThrow', 'testMyFn', 'test: Мой тест'];
    assert.notDeepEqual(ownNamas, namas);
    assert.deepEqual(ownNamas, expectedOwnNames);
    assert.deepEqual(namas, expectedNames);
    let inherit = new InheritClass();
    let result = await inherit.run();
    assert.equal(result.success, true);
    assert.equal(result.done, 3);
    assert.equal(result.fail, 0);
    assert.equal(result.ignore, 0);
    assert.equal(result.total, 3);
    assert.equal(result.total, InheritClass.getTestLength());
    assert.equal(result.total, result.done + result.fail + result.ignore);
    assert.equal(result.items['test: Мой тест'].type, 'function');
    assert.equal(result.items['test: Мой тест'].success, true);
    assert.equal(result.items.testMyFn.success, true);
    assert.equal(result.items.testThrow.success, true);
  }

  async ['test: InheritAndAggregateClass']() {
    let ownNamas = InheritAndAggregateClass.getOwnTestNames();
    let namas = InheritAndAggregateClass.getTestNames();
    let expectedOwnNames = ['testThrow', 'testInheritAndAggregateClass'];
    let expectedNames = ['testThrow', 'testInheritAndAggregateClass', 'testMyFn', 'test: Мой тест'];
    assert.notDeepEqual(ownNamas, namas);
    assert.deepEqual(ownNamas, expectedOwnNames);
    assert.deepEqual(namas, expectedNames);
    let inherit = new InheritAndAggregateClass();
    inherit.on('error', () => {});
    let result = await inherit.run();
    assert.equal(result.success, false);
    assert.equal(result.done, 4);
    assert.equal(result.fail, 2);
    assert.equal(result.ignore, 0);
    assert.equal(result.total, 6);
    assert.equal(result.total, InheritAndAggregateClass.getTestLength());
    assert.equal(result.total, result.done + result.fail + result.ignore);
    assert.equal(result.items['test: Мой тест'].type, 'function');
    assert.equal(result.items['test: Мой тест'].success, true);
    assert.equal(result.items.testMyFn.success, true);
    assert.equal(result.items.testThrow.success, false);
    result = result.items.testInheritAndAggregateClass;
    assert.equal(result.success, false);
    assert.equal(result.done, 2);
    assert.equal(result.fail, 1);
    assert.equal(result.ignore, 0);
    assert.equal(result.total, 3);
    assert.equal(result.total, SimpleClass.getTestLength());
    assert.equal(result.total, result.done + result.fail + result.ignore);
    assert.equal(result.items['test: Мой тест'].type, 'function');
    assert.equal(result.items['test: Мой тест'].success, true);
    assert.equal(result.items.testMyFn.success, true);
    assert.equal(result.items.testThrow.success, false);
  }

  async ['test: CustomTestClass']() {
    let namas = CustomTestClass.getTestNames();
    let recursiveNames = CustomTestClass.getRecursiveTestNames();
    let expectedNames = [
      'testSimpleClass',
      'testAggregateClass',
      'testInheritClass',
      'testInheritAndAggregateClass'
    ];
    let expectedRecursiveNames = [
      'testSimpleClass.testMyFn',
      'testSimpleClass.test: Мой тест',
      'testSimpleClass.testThrow',
      'testAggregateClass.testAggregateClass.testMyFn',
      'testAggregateClass.testAggregateClass.test: Мой тест',
      'testAggregateClass.testAggregateClass.testThrow',
      'testInheritClass.testThrow',
      'testInheritClass.testMyFn',
      'testInheritClass.test: Мой тест',
      'testInheritAndAggregateClass.testThrow',
      'testInheritAndAggregateClass.testInheritAndAggregateClass.testMyFn',
      'testInheritAndAggregateClass.testInheritAndAggregateClass.test: Мой тест',
      'testInheritAndAggregateClass.testInheritAndAggregateClass.testThrow',
      'testInheritAndAggregateClass.testMyFn',
      'testInheritAndAggregateClass.test: Мой тест'
    ];
    assert.deepEqual(namas, expectedNames);
    assert.deepEqual(recursiveNames, expectedRecursiveNames);
    let customTest = new CustomTestClass();
    customTest.on('error', () => {});
    let result = await customTest.run();
    assert.equal(result.type, 'class');
    assert.equal(typeof result.timeline, 'object');
    assert.equal(result.success, false);
    assert.equal(result.done, 11);
    assert.equal(result.fail, 4);
    assert.equal(result.ignore, 0);
    assert.equal(result.total, 15);
    assert.equal(result.total, CustomTestClass.getTestLength());
    assert.equal(result.total, result.done + result.fail + result.ignore);
    assert.equal(result.items.testSimpleClass.type, 'class');
    assert.equal(typeof result.items.testSimpleClass.timeline, 'object');
    assert.equal(typeof result.items.testSimpleClass, 'object');
    assert.equal(typeof result.items.testAggregateClass, 'object');
    assert.equal(typeof result.items.testInheritClass, 'object');
    assert.equal(typeof result.items.testInheritAndAggregateClass, 'object');
  }

  ['test: runIsMainModule']() {
    const app = resolve('source/tests/resources/@ndk/test/my-test-app');
    const status = spawnSync('node', [app], { 'stdio': 'ignore' }).status;
    assert.equal(status, 1);
  }

}


module.exports = NDKTest;
NDKTest.runIsMainModule();
