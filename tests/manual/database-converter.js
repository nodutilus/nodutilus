'use strict';
const Schema = require('@ndk/pg/Schema');
const { deployschema } = require('@ndk/pg/converter');
const { pool } = require('@ndk/pg/connect');

const schema = new Schema('public', {
  tables: new Map()
    .set('repo', {
      columns: new Map()
        .set('id', { type: 'serial' })
        .set('name', { type: 'text' })
        .set('name_u1', { type: 'text' })
        .set('name_u2', { type: 'text' })
        .set('test_opts', { type: 'text', nullable: false, default: "'test'" }),
      unique: new Map()
        .set('repo_name_unique_x', 'name')
        .set('repo_names_unique_x', ['name_u1', 'name_u2']),
      indexes: new Map()
        .set('name_u1_idx', {
          unique: true,
          columns: ['name_u1', 'name_u2', ['name', 'DESC']],
          expression: "name || '123'",
          where: 'name_u1 IS NOT NULL'
        }),
      constraints: new Map()
        .set('repo_pk', { type: 'PRIMARY KEY', column: 'id' })
        .set('repo_name_unique', { type: 'UNIQUE', column: 'name' })
        .set('repo_names_unique', { type: 'UNIQUE', columns: ['name_u1', 'name_u2'] })
    })
    .set('pk_2', {
      columns: new Map()
        .set('pk1', { type: 'serial' })
        .set('pk2', { type: 'int' })
        .set('repo_fk1', { type: 'int' })
        .set('repo_fk2', { type: 'int' })
        .set('repo_fk3', 'int')
        .set('repo_fk4', 'int'),
      unique: ['repo_fk3', 'repo_fk4'],
      primarykey: ['pk1', 'pk2'],
      foreignkeys: new Map()
        .set('repo_fk3', 'repo')
        .set('repo_fk4', { reftable: 'repo', refcolumn: 'id' }),
      constraints: new Map()
        .set('repo_fk1', { type: 'FOREIGN KEY', column: 'repo_fk1', refschema: 'public', reftable: 'repo' })
        .set('pk2_pk2_unique', { type: 'UNIQUE', column: 'pk2' })
        .set('repo_fk2', { type: 'FOREIGN KEY', column: 'repo_fk2', reftable: 'pk_2', refcolumn: 'pk2', action: 'CASCADE' }),
    })
    .set('table2', {
      columns: new Map()
        .set('id', 'serial')
        .set('name', 'text')
        .set('repo', 'int')
        .set('table2', 'int'),
      primarykey: 'id',
      foreignkeys: ['repo', 'table2'],
      unique: 'name',
      indexes: new Map()
        .set('table2_idx1', ['id', 'name'])
        .set('table2_idx2', { columns: ['id', 'name'], expression: 'id || name', where: "name IS NOT NULL AND name <> ''" })
        .set('table2_idx3', 'id || name')
    })
});

(async() => {

  console.log('Начало конвертации');
  console.time('Готово!');

  // Конвертация
  await deployschema(schema);

  // Проверяем снятие опций солонки
  schema._tables.repo._columns.test_opts.nullable = true;
  schema._tables.repo._columns.test_opts.default = false;
  await deployschema(schema);

  // Проверяем добавление схемы
  await deployschema('test', schema);

  console.timeEnd('Готово!');

  // Закрываем основное подключение для выхода из теста
  await pool.end();

})().catch(console.log);
