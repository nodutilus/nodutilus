'use strict';

const { Test } = require('@ndk/test');
const { getType, equalType } = require('@ndk/type');
const { ok, equal, throws } = require('assert').strict;


class NDKType extends Test {

  get name() {
    return '@ndk/type';
  }

  ['test: getType / Primitive Type']() {
    equal(getType(null), 'null');
    equal(getType(undefined), 'undefined');
    equal(getType(true), 'boolean');
    equal(getType(1), 'number');
    equal(getType('1'), 'string');
    equal(getType(Symbol(1)), 'symbol');

    equal(typeof null, 'object');
    equal(typeof undefined, 'undefined');
    equal(typeof true, 'boolean');
    equal(typeof 1, 'number');
    equal(typeof '1', 'string');
    equal(typeof Symbol(1), 'symbol');
  }

  ['test: getType / BAD Primitive Type']() {
    equal(getType(new Boolean()), 'Boolean');
    equal(getType(new Number()), 'Number');
    equal(getType(new String()), 'String');

    equal(typeof new Boolean(), 'object');
    equal(typeof new Number(), 'object');
    equal(typeof new String(), 'object');
  }

  ['test: getType / Illegal Numbers']() {
    equal(getType(NaN), 'NaN');
    equal(getType(parseInt('a', 10)), 'NaN');
    equal(getType(Infinity), 'Infinity');
    equal(getType(+Infinity), 'Infinity');
    equal(getType(-Infinity), 'Infinity');
    equal(getType(Number.POSITIVE_INFINITY), 'Infinity');
    equal(getType(Number.NEGATIVE_INFINITY), 'Infinity');

    equal(typeof NaN, 'number');
    equal(typeof Infinity, 'number');
  }

  ['test: getType / Instance Type']() {
    equal(getType({}), 'Object');
    equal(getType([]), 'Array');
    equal(getType(new Date()), 'Date');
    equal(getType(new Error()), 'Error');
    equal(getType(new RangeError()), 'RangeError');
    equal(getType(Promise.resolve()), 'Promise');
    equal(getType(new Map()), 'Map');
    equal(getType(new Set()), 'Set');
    equal(getType(new WeakMap()), 'WeakMap');
    equal(getType(new WeakSet()), 'WeakSet');
    equal(getType(/abc/), 'RegExp');
    equal(getType(new RegExp('abc')), 'RegExp');

    equal(typeof {}, 'object');
    equal(typeof [], 'object');
    equal(typeof new Date(), 'object');
    equal(typeof new Error(), 'object');
    equal(typeof new RangeError(), 'object');
    equal(typeof Promise.resolve(), 'object');
    equal(typeof new Map(), 'object');
    equal(typeof new Set(), 'object');
    equal(typeof new WeakMap(), 'object');
    equal(typeof new WeakSet(), 'object');
    equal(typeof /abc/, 'object');
    equal(typeof new RegExp('abc'), 'object');
  }

  ['test: getType / User Instance Type']() {
    equal(getType(new class MyClass {}), 'MyClass');
    equal(getType(new function MyFunc() {}), 'MyFunc');

    equal(typeof new class MyClass {}, 'object');
    equal(typeof new function MyFunc() {}, 'object');
  }

  ['test: getType / Functions & Generators']() {
    equal(getType(() => {}), 'Function');
    equal(getType(function*() {}), 'GeneratorFunction');
    equal(getType((function*() {})()), 'Generator');

    equal(typeof(() => {}), 'function');
    equal(typeof(function*() {}), 'function');
    equal(typeof(function*() {})(), 'object');
  }

  ['test: equalType / By Type Name']() {
    ok(equalType(null, 'null'));
    ok(equalType(undefined, 'undefined'));
    ok(equalType(true, 'boolean'));
    ok(equalType(1, 'number'));
    ok(equalType('1', 'string'));
    ok(equalType(Symbol(1), 'symbol'));
    ok(equalType(NaN, 'NaN'));
    ok(equalType(Infinity, 'Infinity'));
    ok(equalType({}, 'Object'));
    ok(equalType([], 'Array'));
    ok(equalType(new Date(), 'Date'));
    ok(equalType(new class MyClass {}, 'MyClass'));
    ok(equalType(() => {}, 'Function'));
    ok(equalType(function*() {}, 'GeneratorFunction'));
  }

  ['test: equalType / BAD Primitive By Type Name']() {
    ok(equalType(new Boolean(true), 'Boolean'));
    ok(equalType(new Number(1), 'Number'));
    ok(equalType(new String('1'), 'String'));
  }

  ['test: equalType / Unknown Type Name']() {
    throws(() => equalType(null, 'abracadabra'), {
      message: "Передано неизвестное имя типа данных: 'abracadabra'"
    });
  }

  ['test: equalType / Primitive By Class']() {
    ok(!equalType(true, Boolean));
    ok(!equalType(1, Number));
    ok(!equalType('1', String));
    ok(!equalType(Symbol(1), Symbol));

    ok(equalType(new Boolean(true), Boolean));
    ok(equalType(new Number(1), Number));
    ok(equalType(new String('1'), String));
  }

  ['test: equalType / Instance By Class']() {
    ok(equalType({}, Object));
    ok(equalType([], Array));
    ok(equalType(new Date(), Date));
    ok(equalType(() => {}, Function));
  }

  ['test: equalType / By User Class']() {
    class MyClass {}
    ok(equalType(new MyClass(), MyClass));

    function MyFunc() {}
    ok(equalType(new MyFunc(), MyFunc));
  }

  ['test: equalType / Invalid Type']() {
    throws(() => equalType(null, null), {
      message: "Передан неверный тип данных, в виде значения с типом: 'null'"
    });
    throws(() => equalType(NaN, NaN), {
      message: "Передан неверный тип данных, в виде значения с типом: 'NaN'"
    });
    throws(() => equalType(null, {}), {
      message: "Передан неверный тип данных, в виде значения с типом: 'Object'"
    });
    throws(() => equalType(null, new Date()), {
      message: "Передан неверный тип данных, в виде значения с типом: 'Date'"
    });
  }

}


module.exports = NDKType;
NDKType.runIsMainModule();
