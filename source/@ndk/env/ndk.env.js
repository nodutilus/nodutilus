/** @module @ndk/env */
'use strict';


class CLArguments {

  /**
   * @name CLArguments.prefixPattern
   * @type {RegExp}
   * @default /^--?/
   */
  static get prefixPattern() {
    return /^--?/;
  }

  /**
   * @name CLArguments.flagPrefix
   * @type {string}
   * @default -
   */
  static get flagPrefix() {
    return '-';
  }

  /**
   * @name CLArguments.optionPrefix
   * @type {string}
   * @default --
   */
  static get optionPrefix() {
    return '--';
  }

  /**
   * @name CLArguments.setterPattern
   * @type {RegExp}
   * @default /=/
   */
  static get setterPattern() {
    return /=/;
  }

  /**
   * @name CLArguments.setter
   * @type {string}
   * @default =
   */
  static get setter() {
    return '=';
  }

  /**
   * @typedef CLArguments~claOptions
   * @prop {RegExp} [prefixPattern=CLArguments.prefixPattern]
   * @prop {string} [flagPrefix=CLArguments.flagPrefix]
   * @prop {string} [optionPrefix=CLArguments.optionPrefix]
   * @prop {RegExp} [setterPattern=CLArguments.setterPattern]
   * @prop {string} [setter=CLArguments.setter]
   */
  /**
   * @typedef CLArguments~solvedArgument
   * @prop {string} name
   * @prop {string} value
   * @prop {boolean} offset
   */
  /**
   * @method CLArguments.resolveArgument
   * @param {string} testName
   * @param {string} [testValue]
   * @param {CLArguments~claOptions} claOptions
   * @returns {CLArguments~solvedArgument}
   */
  static resolveArgument(testName, testValue, {
    prefixPattern = this.prefixPattern,
    setterPattern = this.setterPattern
  } = {}) {
    const result = {};
    if (prefixPattern.test(testName)) {
      const name = testName.replace(prefixPattern, '');
      if (setterPattern.test(name)) {
        const setter = name.replace(setterPattern, ' ').split(' ');
        result.name = setter[0];
        result.value = setter[1];
      } else if (typeof testValue === 'undefined' || prefixPattern.test(testValue)) {
        result.name = name;
      } else {
        result.name = name;
        result.value = testValue;
        result.offset = true;
      }
    } else {
      result.value = testName;
    }
    return result;
  }

  /**
   * @typedef CLArguments~parsedArguments
   * @prop {Object<boolean>} flags
   * @prop {Object<string>} options
   * @prop {Array<string>} args
   */
  /**
   * @method CLArguments.parse
   * @param {string|Array<string>} [input=[]]
   * @param {CLArguments~claOptions} claOptions
   * @returns {CLArguments~parsedArguments}
   */
  static parse(input = [], claOptions) {
    const inputArgs = typeof input === 'string' ? input.split(' ').filter(Boolean) : input;
    const parsed = { flags: {}, options: {}, args: [] };
    for (let index = 0; index < inputArgs.length; index++) {
      const { name, value, offset } = this.resolveArgument(
        inputArgs[index], inputArgs[index + 1], claOptions
      );
      if (name && value) {
        parsed.options[name] = value;
      } else if (name) {
        parsed.flags[name] = true;
      } else {
        parsed.args.push(value);
      }
      if (offset) {
        index++;
      }
    }
    return parsed;
  }

  /**
   * @method CLArguments.stringify
   * @param {CLArguments~parsedArguments} parsedArguments
   * @param {CLArguments~claOptions} claOptions
   * @returns {string}
   */
  static stringify(parsedArguments, {
    flagPrefix = this.flagPrefix,
    optionPrefix = this.optionPrefix,
    setter = this.setter
  } = {}) {
    const args = [];
    if ('flags' in parsedArguments) {
      for (const [name] of Object.entries(parsedArguments.flags)) {
        args.push(flagPrefix + name);
      }
    }
    if ('options' in parsedArguments) {
      for (const [name, value] of Object.entries(parsedArguments.options)) {
        args.push(optionPrefix + name + setter + value);
      }
    }
    if ('args' in parsedArguments) {
      args.push(...parsedArguments.args);
    }
    return args.join(' ');
  }

  /**
   * @class CLArguments
   * @param {CLArguments~claOptions} claOptions
   * @prop {CLArguments~claOptions} claOptions
   * @prop {Object<boolean>} flags
   * @prop {Object<string>} options
   * @prop {Array<string>} args
   */
  constructor(claOptions) {
    this.claOptions = claOptions;
  }

  /**
   * @method CLArguments#parse
   * @param {string|Array<string>} [input=[]]
   * @returns {CLArguments}
   */
  parse(input) {
    return Object.assign(this, this.constructor.parse(input, this.claOptions));
  }

  /**
   * @method CLArguments#stringify
   * @returns {string}
   */
  stringify() {
    return this.constructor.stringify(this, this.claOptions);
  }

}


exports.CLArguments = CLArguments;
