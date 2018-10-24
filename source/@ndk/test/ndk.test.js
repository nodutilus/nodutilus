/** @module @ndk/test */
'use strict';

const EventEmitter = require('events');
const { TimeLinePoint } = require('@ndk/fn/datetime');

const EVENT_ERROR = 'error';
const EVENT_TESTED = 'tested';
const EVENT_TESTED_CLASS = 'testedClass';


class Test extends EventEmitter {

  constructor() {
    super();
    if (!('name' in this)) {
      this.name = this.constructor.name;
    }
  }

  static getOwnTestNames() {
    return Object.getOwnPropertyNames(this.prototype)
      .filter(name => name.startsWith('test'));
  }

  static getTestNames() {
    const names = this.getOwnTestNames();
    let proto = this.__proto__;
    let sanitize = false;
    while (proto !== Test) {
      names.push(...proto.getOwnTestNames());
      proto = proto.__proto__;
      sanitize = true;
    }
    return sanitize ? [...new Set(names)] : names;
  }

  static getTestLength() {
    return this.getTestNames().reduce((length, name) => {
      const test = this.prototype[name];
      if (typeof test === 'function') {
        if (Test.isPrototypeOf(test)) {
          length += test.getTestLength();
        } else {
          length++;
        }
      }
      return length;
    }, 0);
  }

  static getRecursiveTestNames() {
    return this.getTestNames().reduce((names, name) => {
      const test = this.prototype[name];
      if (typeof test === 'function') {
        if (Test.isPrototypeOf(test)) {
          const subNames = test.getRecursiveTestNames();
          for (const subName of subNames) {
            names.push(`${name}.${subName}`);
          }
        } else {
          names.push(name);
        }
      }
      return names;
    }, []);
  }

  static runIsMainModule() {
    if (require.main.exports === this) {
      new TestPrinter(this).run().then(result => {
        if (!result.success) {
          process.exit(1);
        }
      });
    }
  }

  async __runTestClass(result, test) {
    let testResult;
    const timeline = new TimeLinePoint();
    try {
      testResult = await new test()
        .on(EVENT_ERROR, (...args) => this.emit(EVENT_ERROR, ...args))
        .on(EVENT_TESTED, (...args) => this.emit(EVENT_TESTED, ...args))
        .on(EVENT_TESTED_CLASS, (...args) => this.emit(EVENT_TESTED_CLASS, ...args))
        .run();
      result.done += testResult.done;
      result.fail += testResult.fail;
    } catch (error) {
      timeline.end();
      testResult = { timeline, type: 'class', error, success: false };
    }
    if (!testResult.success) {
      result.success = testResult.success;
    }
    return testResult;
  }

  async __runTestFunction(result, testName) {
    const testResult = { timeline: new TimeLinePoint(), success: true, type: 'function' };
    try {
      await this[testName]();
      result.done++;
    } catch (error) {
      testResult.success = false;
      result.success = false;
      testResult.error = error;
      result.fail++;
    }
    testResult.timeline.end();
    this.emit(EVENT_TESTED, this, testName, testResult);
    return testResult;
  }

  async run() {
    const result = { type: 'class', timeline: new TimeLinePoint(), success: true, done: 0, fail: 0, items: {} };
    result.total = this.constructor.getTestLength();
    const testNames = this.constructor.getTestNames();
    for (const testName of testNames) {
      const test = this[testName];
      if (typeof test === 'function') {
        let testResult;
        if (Test.isPrototypeOf(test)) {
          testResult = await this.__runTestClass(result, test);
        } else {
          testResult = await this.__runTestFunction(result, testName);
        }
        if (testResult.error) {
          this.emit(EVENT_ERROR, this, testName, testResult);
        }
        result.items[testName] = testResult;
      }
    }
    result.ignore = result.total - result.done - result.fail;
    result.timeline.end();
    this.emit(EVENT_TESTED_CLASS, this, result);
    return result;
  }

}


function createTest(name, testObject) {
  class CustomTest extends Test { get name() { return name; } }
  Object.assign(CustomTest.prototype, testObject);
  return CustomTest;
}


class TestPrinter {

  constructor(testClass) {
    this.console = require('@ndk/console');
    this.doneMsg = this.doneStyle('✔');
    this.failMsg = this.failStyle('✘');
    this.sepMsg = this.unimportantStyle('/');
    this.ddotMsg = this.unimportantStyle(':');
    this.test = new testClass()
      .on(EVENT_ERROR, (...args) => this[EVENT_ERROR](...args))
      .on(EVENT_TESTED, (...args) => this[EVENT_TESTED](...args))
      .on(EVENT_TESTED_CLASS, (...args) => this[EVENT_TESTED_CLASS](...args));
  }

  unimportantStyle(text) {
    return this.console.style.grey(text);
  }

  importantStyle(text) {
    return this.console.style.bold(text);
  }

  timeStyle(text) {
    text = String(text).split('.');
    text[0] = text[0].padStart(3);
    return this.console.style.yellow(text.join('.'));
  }

  testNameStyle(text) {
    return this.console.style.bold(this.console.style.magenta(text));
  }

  doneStyle(text) {
    return this.console.style.bold(this.console.style.green(text));
  }

  failStyle(text) {
    return this.console.style.bold(this.console.style.red(text));
  }

  ignoreStyle(text) {
    return this.console.style.bold(this.console.style.yellow(text));
  }

  run() {
    this.progress = 0;
    this.total = this.test.constructor.getTestLength();
    return this.test.run().then((result) => this.console.logMessage(...[
      '    ',
      result.success ? this.doneMsg : this.failMsg,
      ...(result.success ? [] : [this.importantStyle(`total: ${result.total} `)]),
      this.doneStyle(`done: ${result.done}`),
      ...(result.fail ? [this.failStyle(` fail: ${result.fail}`)] : []),
      ...(result.ignore ? [this.ignoreStyle(` ignore: ${result.ignore}`)] : [])
    ]) || result, this.console.logError);
  }

  [EVENT_ERROR](instance, testName, result) {
    this.console.logError({ name: 'ExecutionError', message: `${instance.name}.${testName}` });
    this.console.logError(result.error);
  }

  [EVENT_TESTED](instance, testName, result) {
    this.console.logMessage(...[
      ('  ' + (++this.progress / this.total * 100 ^ 0)).slice(-3) + '%',
      result.success ? this.doneMsg : this.failMsg,
      this.timeStyle(result.timeline),
      this.testNameStyle(`${instance.name}`),
      this.ddotMsg,
      this.testNameStyle(`${testName}`)
    ]);
  }

  [EVENT_TESTED_CLASS](instance, result) {
    this.console.logMessage(...[
      '    ',
      result.success ? this.doneMsg : this.failMsg,
      this.timeStyle(result.timeline),
      this.testNameStyle(instance.name),
      this.ddotMsg,
      ...(result.success ? [] : [this.importantStyle(result.total), this.sepMsg]),
      this.doneStyle(result.done),
      ...(result.fail ? [this.sepMsg, this.failStyle(result.fail)] : []),
      ...(result.ignore ? [this.sepMsg, this.ignoreStyle(result.ignore)] : [])
    ]);
  }

}


module.exports.Test = Test;
module.exports.createTest = createTest;
module.exports.TestPrinter = TestPrinter;
