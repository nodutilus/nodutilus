/** @module {Schema} @ndk/pg/converter */
'use strict';
const { resolveclient, transaction } = require('./connect');
const Schema = require('./Schema');

module.exports.deployschema = deployschema;
module.exports.hasschema = hasschema;

async function deployschema(schema_name, schema, client) {
  if (typeof schema_name !== 'string') {
    client = schema;
    schema = schema_name;
    schema_name = schema.name;
  }
  schema = new Schema(schema_name, schema);
  await transaction(client, schema, __deployschema);
}

async function __deployschema(client, schema) {
  if (!await __hasschema(client, schema.name)) {
    await client.query(`CREATE SCHEMA ${schema.name};`);
  }
  for (let table of schema.tables.values()) {
    await __deploytable(table, client);
  }
}

async function hasschema(schema_name, client) {
  return await resolveclient(client, schema_name, __hasschema);
}

async function __hasschema(client, schema_name) {
  const res = await client.query(`
    SELECT EXISTS (
      SELECT
        TRUE
      FROM
        information_schema.schemata
      WHERE
        schema_name = $1::text
    ) exist;
  `, [schema_name]);
  return res.rows[0].exist;
}

async function __deploytable(table, client) {
  if (!await __hastable(table.schema, table.name, client)) {
    await client.query(`CREATE TABLE ${table.schema}.${table.name} ();`);
  }
  for (let column of table.columns.values()) {
    await __deploycolumn(column, client);
  }
  if ('indexes' in table) {
    for (let index of table.indexes.values()) {
      await __deployindex(index, client);
    }
  }
  if ('constraints' in table) {
    for (let constraint of table.constraints.values()) {
      await __deployconstraint(constraint, client);
    }
  }
}

async function __hastable(schema_name, table_name, client) {
  const res = await client.query(`
    SELECT EXISTS (
      SELECT
        TRUE
      FROM
        information_schema.tables
      WHERE
        table_schema = $1::text
        AND table_name = $2::text
    ) exist;
  `, [schema_name, table_name]);
  return res.rows[0].exist;
}

async function __deploycolumn(column, client) {
  if (!await __hascolumn(column.schema, column.table, column.name, client)) {
    let columnoptions = '';
    if (column.nullable === false) {
      columnoptions += ' NOT NULL';
    }
    if (column.default) {
      columnoptions += ` DEFAULT ${column.default}`;
    }
    await client.query(`
      ALTER TABLE ${column.schema}.${column.table}
      ADD COLUMN ${column.name} ${column.type}
      ${columnoptions};
    `);
  }
  await __setcolumnoptions(column, client);
}

async function __hascolumn(schema_name, table_name, column_name, client) {
  const res = await client.query(`
    SELECT EXISTS (
      SELECT
        TRUE
      FROM
        information_schema.columns
      WHERE
        table_schema = $1::text
        AND table_name = $2::text
        AND column_name = $3::text
    ) exist;
  `, [schema_name, table_name, column_name]);
  return res.rows[0].exist;
}

async function __setcolumnoptions(column, client) {
  const options = await __getcolumnoptions(column.schema, column.table, column.name, client);
  var sql = '';
  if ('nullable' in column && column.nullable !== options.nullable) {
    if (column.nullable === false) {
      sql += `
        ALTER TABLE ${column.schema}.${column.table}
        ALTER COLUMN ${column.name} SET NOT NULL;
      `;
    } else {
      sql += `
        ALTER TABLE ${column.schema}.${column.table}
        ALTER COLUMN ${column.name} DROP NOT NULL;
      `;
    }
  }
  if ('default' in column && column.default !== options.default) {
    let equal = false;
    if (column.default && options.default) {
      equal = await client.query(`SELECT ${column.default}::text = ${options.default}::text AS equal;`);
      equal = equal.rows[0].equal;
    }
    if (!equal) {
      if (column.default && typeof column.default === 'string') {
        sql += `
          ALTER TABLE ${column.schema}.${column.table}
          ALTER COLUMN ${column.name} SET DEFAULT ${column.default};
        `;
      } else {
        sql += `
        ALTER TABLE ${column.schema}.${column.table}
        ALTER COLUMN ${column.name} DROP DEFAULT;
      `;
      }
    }
  }
  if (sql) {
    await client.query(sql);
  }
}

async function __getcolumnoptions(schema_name, table_name, column_name, client) {
  const result = await client.query(`
    SELECT
      is_nullable = 'YES' AS nullable,
      column_default AS default
    FROM
      information_schema.columns
    WHERE
      table_schema = $1::text
      AND table_name = $2::text
      AND column_name = $3::text;
  `, [schema_name, table_name, column_name]);
  if (result.rowCount === 0) {
    return undefined;
  }
  return result.rows[0];
}

const __constraint_types_sqlgenerators = {
  'UNIQUE'(options) {
    return `UNIQUE (${options.column || options.columns.join(', ')})`;
  },
  'PRIMARY KEY'(options) {
    return `PRIMARY KEY (${options.column || options.columns.join(', ')})`;
  },
  'FOREIGN KEY'(options) {
    return `FOREIGN KEY (${options.column}) REFERENCES ${options.refschema}.${options.reftable}` +
      ('refcolumn' in options ? ` (${options.refcolumn})` : '') +
      ('on_delete' in options ? ` ON DELETE ${options.on_delete}` : '') +
      ('on_update' in options ? ` ON UPDATE ${options.on_update}` : '');
  }
};

async function __deployconstraint(constraint, client) {
  if (!await __hasconstraint(constraint.schema, constraint.table, constraint.name, client)) {
    let constraint_sql = __constraint_types_sqlgenerators[constraint.type](constraint);
    await client.query(`
      ALTER TABLE ${constraint.schema}.${constraint.table}
      ADD CONSTRAINT ${constraint.name}
      ${constraint_sql};
    `);
  }
}

async function __hasconstraint(schema_name, table_name, constraint_name, client) {
  const res = await client.query(`
    SELECT EXISTS (
      SELECT
        TRUE
      FROM
        information_schema.table_constraints
      WHERE
        table_schema = $1::text
        AND table_name = $2::text
        AND constraint_name = $3::text
    ) exist;
  `, [schema_name, table_name, constraint_name]);
  return res.rows[0].exist;
}

async function __deployindex(index, client) {
  if (!await __hasindex(index.schema, index.table, index.name, client)) {
    let sql = 'CREATE';
    if (index.unique) {
      sql += ' UNIQUE';
    }
    sql += ` INDEX ${index.name} ON ${index.schema}.${index.table}`;
    let columns = [];
    if ('columns' in index) {
      for (let column of index.columns) {
        if (typeof column === 'string') {
          columns.push(column);
        } else if (column instanceof Array) {
          columns.push(column.join(' '));
        }
      }
    }
    if ('expression' in index) {
      columns.push(`(${index.expression})`);
    }
    sql += `\n(${columns.join(', ')})`;
    if ('where' in index) {
      sql += `\nWHERE ${index.where}`;
    }
    await client.query(sql);
  }
}

async function __hasindex(schema_name, table_name, index_name, client) {
  const res = await client.query(`
    SELECT EXISTS (
      SELECT
        TRUE
      FROM
        pg_catalog.pg_indexes
      WHERE
        schemaname = $1::text
        AND tablename = $2::text
        AND indexname = $3::text
    ) exist;
  `, [schema_name, table_name, index_name]);
  return res.rows[0].exist;
}
