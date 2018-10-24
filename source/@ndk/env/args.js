/** @module @ndk/env/args */
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
   * @method CLArguments.resolvePrefixPattern
   * @param {string} [flagPrefix=CLArguments.flagPrefix]
   * @param {string} [optionPrefix=CLArguments.optionPrefix]
   * @returns {RegExp}
   */
  static resolvePrefixPattern(flagPrefix, optionPrefix) {
    if (flagPrefix || optionPrefix) {
      flagPrefix = flagPrefix || this.flagPrefix;
      optionPrefix = optionPrefix || this.optionPrefix;
      if (flagPrefix.length < optionPrefix.length) {
        return new RegExp(`^${optionPrefix}|^${flagPrefix}`);
      } else {
        return new RegExp(`^${flagPrefix}|^${optionPrefix}`);
      }
    } else {
      return this.prefixPattern;
    }
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
   * @method CLArguments.resolveSetterPattern
   * @param {string} [setter=CLArguments.setter]
   * @returns {RegExp}
   */
  static resolveSetterPattern(setter) {
    if (setter) {
      return new RegExp(setter);
    } else {
      return this.setterPattern;
    }
  }

  /**
   * @typedef CLArguments~claOptions
   * @prop {RegExp} [prefixPattern=CLArguments.prefixPattern]
   * @prop {string} [flagPrefix=CLArguments.flagPrefix]
   * @prop {string} [optionPrefix=CLArguments.optionPrefix]
   * @prop {RegExp} [setterPattern=CLArguments.setterPattern]
   * @prop {string} [setter=CLArguments.setter]
   * @prop {Object<string>} [types={}]
   * @prop {Object<string>|Object<Array<string>>} [aliases={}]
   */
  /**
   * @method CLArguments.resolveCLAOptions
   * @param {CLArguments~claOptions} claOptions
   * @returns {CLArguments~claOptions}
   */
  static resolveCLAOptions(claOptions = {}) {
    claOptions.prefixPattern = claOptions.prefixPattern || this.resolvePrefixPattern(
      claOptions.flagPrefix,
      claOptions.optionPrefix
    );
    claOptions.flagPrefix = claOptions.flagPrefix || this.flagPrefix;
    claOptions.optionPrefix = claOptions.optionPrefix || this.optionPrefix;
    claOptions.setterPattern = claOptions.setterPattern || this.resolveSetterPattern(
      claOptions.setter
    );
    claOptions.setter = claOptions.setter || this.setter;
    claOptions.types = claOptions.types || {};
    claOptions.aliases = claOptions.aliases || {};
    return claOptions;
  }

  /**
   * @method CLArguments.resolveArgumentName
   * @param {string} name
   * @param {Object<string>|Object<Array<string>>} aliases
   * @returns {string}
   */
  static resolveArgumentName(name, aliases) {
    if (aliases) {
      for (const [realName, alias] of Object.entries(aliases)) {
        if (name === alias || alias instanceof Array && ~alias.indexOf(name)) {
          return realName;
        }
      }
    }
    return name;
  }

  /**
   * @typedef CLArguments~solvedArgument
   * @prop {string} name
   * @prop {string} value
   * @prop {string} type
   * @prop {boolean} offset
   */
  /**
   * @method CLArguments.resolveArgumentType
   * @param {CLArguments~solvedArgument} solvedArgument
   * @param {Object<string>} types
   * @returns {string}
   */
  static resolveArgumentType({ name, value }, types = {}) {
    let type = types[name];
    if (!type) {
      if (name && value) {
        type = 'Option';
      } else if (name) {
        type = 'Flag';
      } else {
        type = 'Argument';
      }
    }
    return type;
  }

  /**
   * @method CLArguments.resolveArgument
   * @param {string} testName
   * @param {string} [testValue]
   * @param {CLArguments~claOptions} claOptions
   * @returns {CLArguments~solvedArgument}
   */
  static resolveArgument(testName, testValue, claOptions) {
    const { prefixPattern, setterPattern, aliases, types } = this.resolveCLAOptions(claOptions);
    const result = {};
    if (prefixPattern.test(testName)) {
      const name = testName.replace(prefixPattern, '');
      if (setterPattern.test(name)) {
        const setter = name.replace(setterPattern, ' ').split(' ');
        result.name = this.resolveArgumentName(setter[0], aliases);
        result.value = setter[1];
        result.offset = false;
      } else if (typeof testValue === 'undefined' || prefixPattern.test(testValue)) {
        result.name = this.resolveArgumentName(name, aliases);
      } else {
        result.name = this.resolveArgumentName(name, aliases);
        result.value = testValue;
        result.offset = true;
      }
    } else {
      result.value = testName;
    }
    result.type = this.resolveArgumentType(result, types);
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
      const { name, value, type, offset } = this.resolveArgument(
        inputArgs[index], inputArgs[index + 1], claOptions
      );
      switch (type) {
        case 'Option':
          parsed.options[name] = value;
          break;
        case 'Array':
          (parsed.options[name] = parsed.options[name] || []).push(value);
          break;
        case 'Flag':
          parsed.flags[name] = true;
          if (value) {
            parsed.args.push(value);
          }
          break;
        case 'Argument':
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
  static stringify(parsedArguments, claOptions) {
    const { flagPrefix, optionPrefix, setter } = this.resolveCLAOptions(claOptions);
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
    this.claOptions = this.constructor.resolveCLAOptions(claOptions);
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
