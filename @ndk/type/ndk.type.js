/** @module @ndk/type */
'use strict';

const {
  UNKNOWN_TYPE_NAME,
  INVALID_TYPE
} = require('./strings');


/**
 * Возвращает тип переданного аргумента, в соответствии с Google Closure Type System и JSDoc.
 * Позволяет определить такие значения как: `null`, `NaN` , `Infinity`,
 *  а также получить имя типа для экземпляров встроенных и пользвательских классов.
 *
 * @example
 *  getType(null); // 'null'
 *  getType(new Date()); // 'Date'
 *  getType(new class MyClass {}); // 'MyClass'
 *
 * @name getType
 * @param {*} value Любое значения, для которого необходимо определить тип
 * @returns {string}
 */
function getType(value) {
  const nativeType = typeof value;
  switch (nativeType) {
    case 'object':
      if (value === null) return 'null';
      return value.constructor.name || Object.prototype.toString.call(value).slice(8, -1);
    case 'function':
      return value.constructor.name || Object.prototype.toString.call(value).slice(8, -1);
    case 'number':
      if (isFinite(value)) return nativeType;
      if (isNaN(value)) return 'NaN';
      return 'Infinity';
    default:
      return nativeType;
  }
}


/**
 * Проверяет тип данных значения по названию или классу
 *
 * @example
 *  equalType(null, 'null'); // true
 *  equalType(new Date(), Date); // true
 *  equalType(new class MyClass {}, 'MyClass'); // true
 *
 * @name equalType
 * @param {*} value Любое значения, тип которого, нужно сопоставить с указанным типом
 * @param {string|Function} type Имя типа или класс, экземпляром которого должно являться `value`
 * @returns {boolean}
 * @throws Несуществующее название типа
 * @throws Аргумент `type` недопустимого типа
 */
function equalType(value, type) {
  const typeOfType = typeof type;
  switch (typeOfType) {
    case 'string':
      if (getType(value) === type) return true;
      throw new Error(UNKNOWN_TYPE_NAME(type));
    case 'function':
      return value instanceof type;
    default:
      throw new Error(INVALID_TYPE(getType(type)));
  }
}


exports.getType = getType;
exports.equalType = equalType;
