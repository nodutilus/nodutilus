'use strict';

const { equal, deepEqual } = require('assert').strict;

const { Test } = require('@ndk/test');
const { CLArguments } = require('@ndk/env');


class NDKEnv extends Test {

  get name() {
    return '@ndk/env';
  }

  ['test: CLArguments.resolveArgument']() {
    // Флаги
    deepEqual(CLArguments.resolveArgument('--a'), { name: 'a' });
    deepEqual(CLArguments.resolveArgument('-a'), { name: 'a' });
    deepEqual(CLArguments.resolveArgument('--a', '-b'), { name: 'a' });
    deepEqual(CLArguments.resolveArgument('--a', '-b=c'), { name: 'a' });
    // Опции
    deepEqual(CLArguments.resolveArgument('--a', 'b'), { name: 'a', value: 'b', offset: true });
    deepEqual(CLArguments.resolveArgument('-a', 'b'), { name: 'a', value: 'b', offset: true });
    // Присвоение значения опции
    deepEqual(CLArguments.resolveArgument('-a=b'), { name: 'a', value: 'b' });
    deepEqual(CLArguments.resolveArgument('--a=b'), { name: 'a', value: 'b' });
    deepEqual(CLArguments.resolveArgument('--a=b', 'c'), { name: 'a', value: 'b' });
    deepEqual(CLArguments.resolveArgument('--a=b', '-c'), { name: 'a', value: 'b' });
    deepEqual(CLArguments.resolveArgument('--a=b', '-c=e'), { name: 'a', value: 'b' });
    // Аргументы
    deepEqual(CLArguments.resolveArgument('a', 'b'), { value: 'a' });
  }

  ['test: CLArguments.parse']() {
    // Пустые значения
    deepEqual(CLArguments.parse(), { flags: {}, options: {}, args: [] });
    deepEqual(CLArguments.parse(' ', {}), { flags: {}, options: {}, args: [] });
    // Флаги
    deepEqual(CLArguments.parse('-a --b', {}).flags, { a: true, b: true });
    // Опции
    deepEqual(CLArguments.parse('-a b --c=d', {}).options, { a: 'b', c: 'd' });
    deepEqual(CLArguments.parse('--a==b', {}).options, { a: '=b' });
    deepEqual(CLArguments.parse('--a=b=c', {}).options, { a: 'b=c' });
    // Аргументы
    deepEqual(CLArguments.parse('a b c', {}).args, ['a', 'b', 'c']);
    // Флаги + опции
    deepEqual(CLArguments.parse('-a --b -c=d --e f', {}), {
      flags: { a: true, b: true },
      options: { c: 'd', e: 'f' },
      args: []
    });
    deepEqual(CLArguments.parse('-a=--b -c --d', {}), {
      flags: { c: true, d: true },
      options: { a: '--b' },
      args: []
    });
    deepEqual(CLArguments.parse('-a b --c=d -e', {}), {
      flags: { e: true },
      options: { a: 'b', c: 'd' },
      args: []
    });
    // Флаги + аргументы
    deepEqual(CLArguments.parse('a --b', {}), {
      flags: { b: true },
      options: {},
      args: ['a']
    });
    // Флаги + опции + аргументы
    deepEqual(CLArguments.parse('x -a b y -z --c=d', {}), {
      flags: { z: true },
      options: { a: 'b', c: 'd' },
      args: ['x', 'y']
    });
  }

  ['test: CLArguments.stringify']() {
    // Пустой
    equal(CLArguments.stringify({}), '');
    // Флаги
    equal(CLArguments.stringify({ flags: { 'a': true } }), '-a');
    equal(CLArguments.stringify({ flags: { 'a': 'b' } }), '-a');
    // Опции
    equal(CLArguments.stringify({ options: { 'a': 'b' } }), '--a=b');
    equal(CLArguments.stringify({ options: { 'a': true } }), '--a=true');
    // Аргументы
    equal(CLArguments.stringify({ args: ['a', 'b', 'c'] }), 'a b c');
    // Флаги + опции + аргументы
    equal(CLArguments.stringify({
      flags: { a: true },
      options: { b: 'c', d: '=e' },
      args: ['f']
    }), '-a --b=c --d==e f');
  }

  ['_test: CLArguments.constructor']() {
    deepEqual(new CLArguments().namedArgs, {});
    deepEqual(new CLArguments().ordinalArgs, []);
    equal(new CLArguments('a b c').stringify(), 'a b c');
  }
}


module.exports = NDKEnv;
NDKEnv.runIsMainModule();
