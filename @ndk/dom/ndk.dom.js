/** @module @ndk/dom */
'use strict';

class Style {

  constructor(styles) {
    for (let name in styles) {
      this[name] = styles[name];
    }
  }

  toString() {
    let styles = '';
    for (let style in this) {
      styles += `${style}:${this[style]};`;
    }
    return styles;
  }

}

class Attributes {

  constructor(attributes) {
    for (let name in attributes) {
      this[name] = attributes[name];
    }
  }

  toString() {
    let attrs = '';
    for (let attr in this) {
      let value = this[attr];
      if (value === true) {
        attrs += ` ${attr}`;
      } else if (value !== false) {
        attrs += ` ${attr}="${value}"`;
      }
    }
    return attrs;
  }

}

class Element {

  constructor(tagName, attributes, child) {
    switch (arguments.length) {
      case 1:
        if (typeof tagName !== 'string') {
          child = tagName;
          tagName = undefined;
        }
        attributes = {};
        break;
      case 2:
        if (typeof attributes !== 'object' || attributes instanceof Element || attributes instanceof Array) {
          child = attributes;
          attributes = {};
        }
        break;
    }
    this.tagName = tagName;
    this.attributes = new Attributes(attributes);
    this.childNodes = [];
    if (child) {
      this.appendChild(child);
    }
  }

  appendChild(child) {
    if (child instanceof Array) {
      this.childNodes.push(...child);
    } else {
      this.childNodes.push(child);
    }
    return this;
  }

  get innerHTML() {
    let html = '';
    for (let child of this.childNodes) {
      html += child;
    }
    return html;
  }

  get outerHTML() {
    let html = this.innerHTML;
    if (this.tagName) {
      html = `<${this.tagName}${this.attributes}>${html}</${this.tagName}>`;
    }
    return html;
  }

  toString() {
    return this.outerHTML;
  }

  [Symbol.toPrimitive]() {
    return this.outerHTML;
  }

  inspect() {
    return undefined;
  }

  then(resolve) {
    resolve(this.outerHTML);
    return Promise.resolve(this.outerHTML);
  }
}

class Page extends Element {

  constructor(attributes) {
    super('html', attributes);
  }

  get outerHTML() {
    let html = super.outerHTML;
    return `<!DOCTYPE html>${html}`;
  }

}

const propertyElementHandler = {

  get(target, property, receiver) {
    if (property in target || typeof property !== 'string') {
      return target[property];
    } else {
      return target[property] = (...args) => {
        if (typeof args[args.length - 1] === 'function') {
          const callback = args.pop();
          const proxy = new Proxy(new Element(property, ...args), propertyElementHandler);
          target.childNodes.push(proxy);
          callback(proxy);
        } else {
          target.childNodes.push(new Proxy(new Element(property, ...args), propertyElementHandler));
        }
        return receiver;
      };
    }
  },

  set() {
    return false;
  }

};

const constructElement = function constructElement(...args) {
  return new Proxy(new Element(...args), propertyElementHandler);
};

const constructPage = function constructPage(...args) {
  return new Proxy(new Page(...args), propertyElementHandler);
};

const constructElementHandler = {

  apply: () => Element(),

  construct: (target, args) => target(...args)

};

exports.Style = Style;
exports.Attributes = Attributes;
exports.Element = new Proxy(constructElement, constructElementHandler);
exports.Page = new Proxy(constructPage, constructElementHandler);
