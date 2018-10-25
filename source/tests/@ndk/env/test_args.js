'use strict';

const { equal, deepEqual } = require('assert').strict;

const { Test } = require('@ndk/test');
const { CLArguments, getProcessArgs } = require('@ndk/env');


class TestEnvArgs extends Test {

  get name() {
    return '@ndk/env/args';
  }

  ['test: CLArguments.resolvePrefixPattern']() {
    deepEqual(CLArguments.resolvePrefixPattern(), /^--?/);
    deepEqual(CLArguments.resolvePrefixPattern('#'), /^--|^#/);
    deepEqual(CLArguments.resolvePrefixPattern('###'), /^###|^--/);
    deepEqual(CLArguments.resolvePrefixPattern(undefined, '#'), /^-|^#/);
  }

  ['test: CLArguments.resolveSetterPattern']() {
    deepEqual(CLArguments.resolveSetterPattern(), /=/);
    deepEqual(CLArguments.resolveSetterPattern(':='), /:=/);
  }

  ['test: CLArguments.resolveCLAOptions']() {
    // Опции по умолчанию
    deepEqual(CLArguments.resolveCLAOptions(), {
      prefixPattern: /^--?/,
      flagPrefix: '-',
      optionPrefix: '--',
      setterPattern: /=/,
      setter: '=',
      types: {},
      aliases: {}
    });
    // Изменение префикса флага
    deepEqual(CLArguments.resolveCLAOptions({ flagPrefix: '#' }), {
      prefixPattern: /^--|^#/,
      flagPrefix: '#',
      optionPrefix: '--',
      setterPattern: /=/,
      setter: '=',
      types: {},
      aliases: {}
    });
    // Изменение префикса опции
    deepEqual(CLArguments.resolveCLAOptions({ optionPrefix: '##' }), {
      prefixPattern: /^##|^-/,
      flagPrefix: '-',
      optionPrefix: '##',
      setterPattern: /=/,
      setter: '=',
      types: {},
      aliases: {}
    });
    // Изменение сеттера
    deepEqual(CLArguments.resolveCLAOptions({ setter: ':=' }), {
      prefixPattern: /^--?/,
      flagPrefix: '-',
      optionPrefix: '--',
      setterPattern: /:=/,
      setter: ':=',
      types: {},
      aliases: {}
    });
  }

  ['test: CLArguments.resolveArgumentName']() {
    equal(CLArguments.resolveArgumentName('name'), 'name');
    equal(CLArguments.resolveArgumentName('name', {}), 'name');
    equal(CLArguments.resolveArgumentName('n', { 'name': 'n' }), 'name');
    equal(CLArguments.resolveArgumentName('n', { 'name': 'nn' }), 'n');
    equal(CLArguments.resolveArgumentName('n2', { 'name': 'n' }), 'n2');
    equal(CLArguments.resolveArgumentName('nn', { 'name': ['n', 'nn'] }), 'name');
    equal(CLArguments.resolveArgumentName('nn', { 'name': ['n', 'nna'] }), 'nn');
  }

  ['test: CLArguments.resolveArgumentType']() {
    equal(CLArguments.resolveArgumentType({ name: 'name' }), 'Flag');
    equal(CLArguments.resolveArgumentType({ value: 'name' }), 'Argument');
    equal(CLArguments.resolveArgumentType({ name: 'name', value: 'name' }), 'Option');
    equal(CLArguments.resolveArgumentType({ name: 'name', value: 'name' }, { name: 'Flag' }), 'Flag');
  }

  ['test: CLArguments.resolveArgument']() {
    // Флаги
    deepEqual(CLArguments.resolveArgument('--a'), { name: 'a', type: 'Flag' });
    deepEqual(CLArguments.resolveArgument('-a'), { name: 'a', type: 'Flag' });
    deepEqual(CLArguments.resolveArgument('--a', '-b'), { name: 'a', type: 'Flag' });
    deepEqual(CLArguments.resolveArgument('--a', '-b=c'), { name: 'a', type: 'Flag' });
    // Опции
    deepEqual(CLArguments.resolveArgument('--a', 'b'), { name: 'a', value: 'b', type: 'Option', offset: true });
    deepEqual(CLArguments.resolveArgument('-a', 'b'), { name: 'a', value: 'b', type: 'Option', offset: true });
    // Присвоение значения опции
    deepEqual(CLArguments.resolveArgument('-a=b'), { name: 'a', value: 'b', type: 'Option', offset: false });
    deepEqual(CLArguments.resolveArgument('--a=b'), { name: 'a', value: 'b', type: 'Option', offset: false });
    deepEqual(CLArguments.resolveArgument('--a=b', 'c'), { name: 'a', value: 'b', type: 'Option', offset: false });
    deepEqual(CLArguments.resolveArgument('--a=b', '-c'), { name: 'a', value: 'b', type: 'Option', offset: false });
    deepEqual(CLArguments.resolveArgument('--a=b', '-c=e'), { name: 'a', value: 'b', type: 'Option', offset: false });
    // Аргументы
    deepEqual(CLArguments.resolveArgument('a', 'b'), { value: 'a', type: 'Argument' });
  }

  ['test: CLArguments.parse - base']() {
    // Пустые значения
    deepEqual(CLArguments.parse(), { flags: {}, options: {}, argv: [] });
    deepEqual(CLArguments.parse(' ', {}), { flags: {}, options: {}, argv: [] });
    // Флаги
    deepEqual(CLArguments.parse('-a --b').flags, { a: true, b: true });
    // Опции
    deepEqual(CLArguments.parse('-a b --c=d').options, { a: 'b', c: 'd' });
    deepEqual(CLArguments.parse('--a==b').options, { a: '=b' });
    deepEqual(CLArguments.parse('--a=b=c').options, { a: 'b=c' });
    // Аргументы
    deepEqual(CLArguments.parse('a b c').argv, ['a', 'b', 'c']);
    // Флаги + опции
    deepEqual(CLArguments.parse('-a --b -c=d --e f'), {
      flags: { a: true, b: true },
      options: { c: 'd', e: 'f' },
      argv: []
    });
    deepEqual(CLArguments.parse('-a=--b -c --d'), {
      flags: { c: true, d: true },
      options: { a: '--b' },
      argv: []
    });
    deepEqual(CLArguments.parse('-a b --c=d -e'), {
      flags: { e: true },
      options: { a: 'b', c: 'd' },
      argv: []
    });
    // Флаги + аргументы
    deepEqual(CLArguments.parse('a --b'), {
      flags: { b: true },
      options: {},
      argv: ['a']
    });
    // Флаги + опции + аргументы
    deepEqual(CLArguments.parse('x -a b y -z --c=d'), {
      flags: { z: true },
      options: { a: 'b', c: 'd' },
      argv: ['x', 'y']
    });
  }

  ['test: CLArguments.parse - aliases']() {
    // Псевдонимы
    deepEqual(CLArguments.parse('x -a b y -z --c=d', {
      aliases: { zz: 'z', aa: 'a', cc: 'c' }
    }), {
      flags: { zz: true },
      options: { aa: 'b', cc: 'd' },
      argv: ['x', 'y']
    });
  }

  ['test: CLArguments.parse - types']() {
    // Типы, переопределение опции флагом, аргументом
    // 1. Опции -> Флаги = выталкивают value в аргументы
    // 2. Опции -> Аргументы = теряют name, выталкивая value в аргументы
    deepEqual(CLArguments.parse('--a b --c=d --e=f -x y -z zv', {
      aliases: { 'zet': 'z' },
      types: { a: 'Flag', c: 'Flag', e: 'Argument', x: 'Argument', zet: 'Flag' }
    }), {
      flags: { a: true, c: true, zet: true },
      options: {},
      argv: ['b', 'd', 'f', 'y', 'zv']
    });
    deepEqual(CLArguments.parse('--a --b', {
      types: { a: 'Option', b: 'Argument' }
    }), {
      flags: {},
      options: { a: undefined },
      argv: [undefined]
    });
  }

  ['test: CLArguments.parse - type: Array']() {
    // Массив опций
    // Задается дублированием опции
    deepEqual(CLArguments.parse('--a b --c=d --c e -c f g', {
      types: { c: 'Array' }
    }), {
      flags: {},
      options: { a: 'b', c: ['d', 'e', 'f'] },
      argv: ['g']
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
    equal(CLArguments.stringify({ argv: ['a', 'b', 'c'] }), 'a b c');
    // Флаги + опции + аргументы
    equal(CLArguments.stringify({
      flags: { a: true },
      options: { b: 'c', d: '=e' },
      argv: ['f']
    }), '-a --b=c --d==e f');
  }

  ['test: class CLArguments - claOptions Full']() {
    const claOptions = {
      prefixPattern: /^##?/,
      flagPrefix: '#',
      optionPrefix: '##',
      setterPattern: /:=/,
      setter: ':='
    };
    const argsString = '#a ##b:=c xyz';
    const clArgsInst = new CLArguments(claOptions);
    deepEqual(clArgsInst.claOptions, claOptions);
    const clArgs = clArgsInst.parse(argsString);
    // parse c полным набором опций
    deepEqual(clArgs.flags, { a: true });
    deepEqual(clArgs.options, { b: 'c' });
    deepEqual(clArgs.argv, ['xyz']);
    // stringify c полным набором опций
    equal(clArgs.stringify(), argsString);
  }

  ['test: class CLArguments - claOptions Lite']() {
    const claOptions = {
      flagPrefix: '#',
      optionPrefix: '##',
      setter: ':='
    };
    const argsString = '#a ##b:=c xyz';
    const clArgsInst = new CLArguments(claOptions);
    deepEqual(clArgsInst.claOptions, claOptions);
    const clArgsFull = clArgsInst.parse(argsString);
    // parse c облегченным набором опций
    deepEqual(clArgsFull.flags, { a: true });
    deepEqual(clArgsFull.options, { b: 'c' });
    deepEqual(clArgsFull.argv, ['xyz']);
    // stringify c облегченным набором опций
    equal(clArgsFull.stringify(), argsString);
  }

  ['test: class CLArguments - claOptions Lite + RegExp Symbols']() {
    const claOptions = {
      flagPrefix: '*',
      optionPrefix: '..',
      setter: '[['
    };
    const argsString = '*a ..b[[c xyz';
    const clArgsInst = new CLArguments(claOptions);
    deepEqual(clArgsInst.claOptions, claOptions);
    const clArgsFull = clArgsInst.parse(argsString);
    // parse c облегченным набором опций
    deepEqual(clArgsFull.flags, { a: true });
    deepEqual(clArgsFull.options, { b: 'c' });
    deepEqual(clArgsFull.argv, ['xyz']);
    // stringify c облегченным набором опций
    equal(clArgsFull.stringify(), argsString);
  }

  ['test: class CLArguments - extends']() {
    class XCLArgs extends CLArguments {
      static get prefixPattern() {
        return /^\*\*?/;
      }
      static get flagPrefix() {
        return '*';
      }
      static get optionPrefix() {
        return '**';
      }
      static get setterPattern() {
        return /:/;
      }
      static get setter() {
        return ':';
      }
    }
    const xclArgs = new XCLArgs();
    const { flags, options, argv } = xclArgs.parse('*a **b c *d:e f');
    deepEqual(flags, { a: true });
    deepEqual(options, { b: 'c', d: 'e' });
    deepEqual(argv, ['f']);
  }

  ['test: class CLArguments - extends - user type']() {
    class XCLArgs extends CLArguments {
      static setterTypeOptionNumber({ options }, { name, value }) {
        value = Number(value);
        if (!isNaN(value)) {
          options[name] = value;
        }
      }
    }
    const xclArgs = new XCLArgs({
      types: { a: 'OptionNumber' }
    });
    deepEqual(xclArgs.parse('--a 123').options, { a: 123 });
    deepEqual(xclArgs.parse('--a a').options, {});
  }

  ['test: getProcessArgs']() {
    process.argv.push('--a', 'b', '--c=d', '--e=f', '-x', 'y');
    const processArgs = getProcessArgs({
      types: { a: 'Flag', c: 'Flag', e: 'Argument', x: 'Argument' }
    });
    deepEqual(processArgs.flags, { a: true, c: true });
    deepEqual(processArgs.options, {});
    deepEqual(processArgs.argv, ['b', 'd', 'f', 'y']);
  }

}


module.exports = TestEnvArgs;
TestEnvArgs.runIsMainModule();
