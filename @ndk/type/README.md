## Описание

Расширяет возможности работы с типами данных.
Позволяет более точно определить тип переменной,
  проверить её соответствие указанному типу или конструктору.
За основу взяты типы из [`Google Closure Type System`](https://github.com/google/closure-compiler/wiki/Types-in-the-Closure-Type-System).
А определение имени типа, соответствуюет типам,
  которые указываются в блоках комментариев [`JSDoc`](http://usejsdoc.org/tags-type.html).

**Пример**

```js
const { getType, equalType } = require('@ndk/type');

console.log(getType([])); // Array
console.log(getType(1));  // number

console.log(equalType([], 'Array'));      // true
console.log(equalType(new Date(), Date)); // true
console.log(equalType(null, Object));     // false

class MyClass {}
console.log(equalType(new MyClass(), 'MyClass')); // true
console.log(equalType(new MyClass(), MyClass));   // true
```

## Таблица соответствия типов

Значение                  | getType               | typeof
--------------------------|-----------------------|----------
**Примитивы** | |
`null`                    | `'null'`              | `'object'`
`undefined`               | `'undefined'`         | `'undefined'`
`true`                    | `'boolean'`           | `'boolean'`
`1.2`                     | `'number'`            | `'number'`
`'abc'`                   | `'string'`            | `'string'`
`Symbol(1)`               | `'symbol'`            | `'symbol'`
**Примитивы как объекты [\*](#Примечания)** | |
`new Boolean()`           | `'Boolean'`           | `'object'`
`new Number()`            | `'Number'`            | `'object'`
`new String()`            | `'String'`            | `'object'`
**Исключения для чисел** | |
`NaN`                     | `'NaN'`               | `'number'`
`Infinity`                | `'Infinity'`          | `'number'`
**Экземпляры встроенных классов** | |
`{}`                      | `'Object'`            | `'object'`
`[1,2,3]`                 | `'Array'`             | `'object'`
`new Date()`              | `'Date'`              | `'object'`
`new Error()`             | `'Error'`             | `'object'`
`new RangeError()`        | `'RangeError'`        | `'object'`
`Promise.resolve()`       | `'Promise'`           | `'object'`
`new Map()`               | `'Map'`               | `'object'`
`new Set()`               | `'Set'`               | `'object'`
`new WeakMap()`           | `'WeakMap'`           | `'object'`
`new WeakSet()`           | `'WeakSet'`           | `'object'`
`/abc/`                   | `'RegExp'`            | `'object'`
**Экземпляры пользовательских классов** | |
`new function MyFunc(){}` | `'MyFunc'`            | `'object'`
`new class MyClass{}`     | `'MyClass'`           | `'object'`
**Функции и генераторы** | |
`function () {}`          | `'Function'`          | `'function'`
`function *() {}`         | `'GeneratorFunction'` | `'function'`
`(function *() {})()`     | `'Generator'`         | `'object'`

###### Примечания

> **\*** - Лучше никогда не использовать эти объекты "Примитивов" :bug:
