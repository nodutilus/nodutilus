'use strict';

const { equal, deepEqual } = require('assert').strict;

const { Test } = require('@ndk/test');
const { CLArguments } = require('@ndk/env');


class NDKEnv extends Test {

  get name() {
    return '@ndk/env';
  }

  ['test: CLArguments.parse']() {
    deepEqual(CLArguments.parse(), { namedArgs: {}, ordinalArgs: [] });
    deepEqual(CLArguments.parse('a b c').ordinalArgs, ['a', 'b', 'c']);
    deepEqual(CLArguments.parse(['-a', '--b', 'c', '-d=e']).namedArgs, { a: true, b: 'c', d: 'e' });
  }

  ['test: CLArguments.stringify']() {
    equal(CLArguments.stringify({ namedArgs: { a: 'b', 'c': true } }), '--a b --c');
    equal(CLArguments.stringify({ ordinalArgs: ['a', 'b', 'c'] }), 'a b c');
    equal(CLArguments.stringify({
      namedArgs: { a: 'b', 'c': true },
      ordinalArgs: ['a', 'b', 'c']
    }), 'a b c --a b --c');
    equal(CLArguments.stringify({ namedArgs: { a: false } }), '');
  }

  ['test: CLArguments.constructor']() {
    deepEqual(new CLArguments().namedArgs, {});
    deepEqual(new CLArguments().ordinalArgs, []);
    equal(new CLArguments('a b c').stringify(), 'a b c');
  }
}


module.exports = NDKEnv;
NDKEnv.runIsMainModule();
