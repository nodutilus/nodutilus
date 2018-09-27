/** @module {Schema} @ndk/pg/Schema */
'use strict';
const valid_name_re = /^[a-z][a-z_\d]+$/;
const valid_type_re = /^[a-z][a-z_\d, [\]()]+$/;

const Schema = module.exports = class Schema {
  /**
   * @class Schema
   * @param {string} schema_name
   * @param {Object} options
   * @param {Map} options.tables
   */
  constructor(schema_name, options) {
    this.name = Schema.validname(schema_name);
    const tables = this.tables = new Map();
    const _tables = this._tables = {};
    for (let [name, table] of options.tables) {
      table = new Table(schema_name, name, table);
      tables.set(name, table);
      _tables[name] = table;
    }
  }

  static validname(name) {
    if (valid_name_re.test(name)) {
      return name;
    } else {
      throw Error(`Invalid name '${name}'`);
    }
  }

};

const Table = module.exports.Table = class Table {
  /**
   * @class Table
   * @param {string} schema_name
   * @param {string} table_name
   * @param {Object} options
   * @param {Map} options.columns
   * @param {string|Array} options.primarykey
   * @param {Map|Array<string>} options.foreignkeys
   * @param {Map} options.indexes
   * @param {Map} options.constraints
   */
  constructor(schema_name, table_name, options) {
    this.schema = Schema.validname(schema_name);
    this.name = Schema.validname(table_name);
    const columns = this.columns = new Map();
    const _columns = this._columns = {};
    for (let [name, column] of options.columns) {
      column = new Column(schema_name, table_name, name, column);
      columns.set(name, column);
      _columns[name] = column;
    }
    if ('unique' in options) {
      const constraints = this.constraints = new Map();
      const _constraints = this._constraints = {};
      if (typeof options.unique === 'string') {
        let constraint_name = `u__${this.name}__${options.unique}`;
        if ('constraints' in options && options.constraints.has(constraint_name)) {
          throw Error(`Duplicate constraint name '${constraint_name}'`);
        }
        let constraint = { type: 'UNIQUE', column: options.unique };
        constraint = new Constraint(schema_name, table_name, constraint_name, constraint);
        constraints.set(constraint_name, constraint);
        _constraints[constraint_name] = constraint;
      } else if (options.unique instanceof Array) {
        let constraint_name = `u__${this.name}__composite`;
        if ('constraints' in options && options.constraints.has(constraint_name)) {
          throw Error(`Duplicate constraint name '${constraint_name}'`);
        }
        let constraint = { type: 'UNIQUE', columns: options.unique };
        constraint = new Constraint(schema_name, table_name, constraint_name, constraint);
        constraints.set(constraint_name, constraint);
        _constraints[constraint_name] = constraint;
      } else {
        for (let [constraint_name, columns] of options.unique) {
          if ('constraints' in options && options.constraints.has(constraint_name)) {
            throw Error(`Duplicate constraint name '${constraint_name}'`);
          }
          let constraint = { type: 'UNIQUE' };
          if (typeof columns === 'string') {
            constraint.column = columns;
          } else {
            constraint.columns = columns;
          }
          constraint = new Constraint(schema_name, table_name, constraint_name, constraint);
          constraints.set(constraint_name, constraint);
          _constraints[constraint_name] = constraint;
        }
      }
    }
    if ('primarykey' in options) {
      const constraints = this.constraints = this.constraints || new Map();
      const _constraints = this._constraints = this._constraints || {};
      let constraint_name, constraint = { type: 'PRIMARY KEY' };
      if (typeof options.primarykey === 'string') {
        constraint_name = `pk__${this.name}__${options.primarykey}`;
      } else {
        constraint_name = `pk__${this.name}__composite`;
      }
      if ('constraints' in options && options.constraints.has(constraint_name)) {
        throw Error(`Duplicate constraint name '${constraint_name}'`);
      }
      if (typeof options.primarykey === 'string') {
        constraint.column = options.primarykey;
      } else {
        constraint.columns = options.primarykey;
      }
      constraint = new Constraint(schema_name, table_name, constraint_name, constraint);
      constraints.set(constraint_name, constraint);
      _constraints[constraint_name] = constraint;
    }
    if ('foreignkeys' in options) {
      const constraints = this.constraints = this.constraints || new Map();
      const _constraints = this._constraints = this._constraints || {};
      if (options.foreignkeys instanceof Array) {
        options.foreignkeys.forEach((column_name) => {
          let constraint_name = `fk__${this.name}__${column_name}`;
          if ('constraints' in options && options.constraints.has(constraint_name)) {
            throw Error(`Duplicate constraint name '${constraint_name}'`);
          }
          let constraint = { type: 'FOREIGN KEY', column: column_name, reftable: column_name };
          constraint = new Constraint(schema_name, table_name, constraint_name, constraint);
          constraints.set(constraint_name, constraint);
          _constraints[constraint_name] = constraint;
        });
      } else {
        for (let [column_name, constraint] of options.foreignkeys) {
          let constraint_name;
          if (typeof constraint === 'string') {
            constraint_name = `fk__${this.name}__${column_name}__${constraint}`;
            constraint = { type: 'FOREIGN KEY', column: column_name, reftable: constraint };
          } else {
            if (!('reftable' in constraint)) {
              constraint.reftable = column_name;
            }
            constraint_name = `fk__${this.name}__${column_name}__${constraint.reftable}`;
            if ('refcolumn' in constraint) {
              constraint_name += `__${constraint.refcolumn}`;
            }
            constraint.type = 'FOREIGN KEY';
            constraint.column = column_name;
          }
          if ('constraints' in options && options.constraints.has(constraint_name)) {
            throw Error(`Duplicate constraint name '${constraint_name}'`);
          }
          constraint = new Constraint(schema_name, table_name, constraint_name, constraint);
          constraints.set(constraint_name, constraint);
          _constraints[constraint_name] = constraint;
        }
      }
    }
    if ('indexes' in options) {
      const indexes = this.indexes = new Map();
      const _indexes = this._indexes = {};
      for (let [name, index] of options.indexes) {
        index = new Index(schema_name, table_name, name, index);
        indexes.set(name, index);
        _indexes[name] = index;
      }
    }
    if ('constraints' in options) {
      const constraints = this.constraints = this.constraints || new Map();
      const _constraints = this._constraints = this._constraints || {};
      for (let [name, constraint] of options.constraints) {
        constraint = new Constraint(schema_name, table_name, name, constraint);
        constraints.set(name, constraint);
        _constraints[name] = constraint;
      }
    }
  }

};

const Column = module.exports.Column = class Column {
  /**
   * @class Column
   * @param {string} schema_name
   * @param {string} table_name
   * @param {string} column_name
   * @param {Object|string} options
   * @param {string} options.type
   * @param {boolean} [options.nullable=true]
   * @param {string|null} [options.default=null]
   */
  constructor(schema_name, table_name, column_name, options) {
    this.schema = Schema.validname(schema_name);
    this.table = Schema.validname(table_name);
    this.name = Schema.validname(column_name);
    if (typeof options === 'string') {
      options = { type: options };
    }
    this.type = Column.validtype(options.type);
    if ('nullable' in options) {
      this.nullable = Column.validnullable(options.nullable);
    }
    if ('default' in options) {
      this.default = Column.validdefault(options.default);
    }
  }

  static validtype(type) {
    if (valid_type_re.test(type)) {
      return type;
    } else {
      throw Error(`Invalid column type '${type}'`);
    }
  }

  static validnullable(value) {
    if (typeof value !== 'boolean') {
      throw Error(`Invalid nullable value '${value}'`);
    } else {
      return value;
    }
  }

  static validdefault(value) {
    if (value && typeof value !== 'string') {
      throw Error(`Invalid default value '${value}'`);
    } else {
      return value;
    }
  }

};

const Constraint = module.exports.Constraint = class Constraint {
  /**
   * @class Constraint
   * @param {string} schema_name
   * @param {string} table_name
   * @param {string} constraint_name
   * @param {Object} options
   * @param {string} options.type
   */
  constructor(schema_name, table_name, constraint_name, options) {
    this.schema = Schema.validname(schema_name);
    this.table = Schema.validname(table_name);
    this.name = Schema.validname(constraint_name);
    this.type = Constraint.validtype(options.type);
    Constraint.types[this.type].call(this, options);
  }

  static validtype(type) {
    let _type = type.toUpperCase();
    if (_type in Constraint.types) {
      return _type;
    } else {
      throw Error(`Invalid constraint type '${type}'`);
    }
  }

  static validaction(action) {
    if (~['NO ACTION', 'RESTRICT', 'CASCADE', 'SET NULL', 'SET DEFAULT'].indexOf(action.toUpperCase())) {
      return action;
    } else {
      throw Error(`Invalid constraint action '${action}'`);
    }
  }

};

Constraint.types = {
  'CHECK' () {},
  'UNIQUE' (options) {
    if ('column' in options) {
      this.column = Schema.validname(options.column);
    } else if ('columns' in options) {
      this.columns = [];
      options.columns.forEach((column_name) => {
        this.columns.push(Schema.validname(column_name));
      });
    } else {
      throw Error("Unspecified option: 'column' or 'columns'");
    }
  },
  'PRIMARY KEY' (options) {
    Constraint.types['UNIQUE'].call(this, options);
  },
  'FOREIGN KEY' (options) {
    this.column = Schema.validname(options.column);
    if ('refschema' in options) {
      this.refschema = Schema.validname(options.refschema);
    } else {
      this.refschema = Schema.validname(this.schema);
    }
    this.reftable = Schema.validname(options.reftable);
    if ('refcolumn' in options) {
      this.refcolumn = Schema.validname(options.refcolumn);
    }
    if ('action' in options) {
      this.action = this.on_delete = this.on_update = Constraint.validaction(options.action);
    } else {
      this.action = this.on_delete = this.on_update = 'RESTRICT';
    }
  }
};


const Index = module.exports.Index = class Index {
  /**
   * @class Constraint
   * @param {string} schema_name
   * @param {string} table_name
   * @param {string} index_name
   * @param {Object|Array|string} options
   * @param {boolean} [options.unique=]
   * @param {Array} [options.columns=]
   * @param {string} [options.expression=]
   * @param {string} [options.where=]
   */
  constructor(schema_name, table_name, index_name, options) {
    this.schema = Schema.validname(schema_name);
    this.table = Schema.validname(table_name);
    this.name = Schema.validname(index_name);
    if (typeof options === 'string') {
      options = { expression: options };
    } else if (options instanceof Array) {
      options = { columns: options };
    }
    if ('unique' in options) {
      this.unique = Index.validunique(options.unique);
    }
    if ('columns' in options) {
      this.columns = [];
      for (let column of options.columns) {
        if (typeof column === 'string') {
          this.columns.push(Schema.validname(column));
        } else if (column instanceof Array) {
          column = column.slice();
          let col_props = [Schema.validname(column.shift())];
          for (let col_prop of column) {
            col_props.push(Index.validcolumnproperty(col_prop));
          }
          this.columns.push(col_props);
        }
      }
    }
    if ('expression' in options) {
      this.expression = Index.validexpression(options.expression);
    }
    if (!this.columns && !this.expression) {
      throw Error("Invalid options of index, set 'columns' or 'expression'");
    }
    if ('where' in options) {
      this.where = Index.validwhere(options.where);
    }
  }

  static validunique(value) {
    if (typeof value !== 'boolean') {
      throw Error(`Invalid unique value '${value}'`);
    } else {
      return value;
    }
  }

  static validcolumnproperty(property) {
    if (~['ASC', 'DESC', 'NULLS FIRST', 'NULLS LAST'].indexOf(property.toUpperCase())) {
      return property;
    } else {
      throw Error(`Invalid index column property '${property}'`);
    }
  }

  static validexpression(expression) {
    if (expression && typeof expression !== 'string') {
      throw Error(`Invalid index expression '${expression}'`);
    } else {
      return expression;
    }
  }

  static validwhere(where) {
    if (where && typeof where !== 'string') {
      throw Error(`Invalid index predicate '${where}'`);
    } else {
      return where;
    }
  }

};
