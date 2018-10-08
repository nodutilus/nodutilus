'use strict';
const TaskMaster = require('@ndk/ps/TaskMaster');

const tm = new TaskMaster({
  file: __dirname + '/TaskMaster_worker.js',
  method: 'runTask',
  tasks: [{
    name: 'task1'
  }]
});

tm.add({ name: 'task2' });

console.log('Idle? -', tm.isIdle());

tm.add([{ name: 'arr_task3' }, { name: 'arr_task4' }]);

console.log('Idle? -', tm.isIdle());

tm.on('done', (task, res) => {
  console.log('DONE', task, res);
});

tm.on('error', (task, err) => {
  console.error(task && task.name, err.stack);
});

setTimeout(() => {
  tm.add({ name: 'async' });
  console.log('Idle? -', tm.isIdle());

  setTimeout(() => {
    tm.add([{ name: 'arr_async1' }, { name: 'arr_async2' }, { name: 'arr_async3' }]);
    console.log('Idle? -', tm.isIdle());
  }, 2000);

  setTimeout(() => {

    tm.execute({ name: 'execute' })
      .then(res => { console.log('EXECUTE:', res.done); }, console.error);

    tm.execute([{ name: 'execute_ARR1' }, { name: 'execute_ARR2' }, { name: 'execute_ARR3' }])
      .then(res => { console.log('EXECUTE ARR:', res); }, console.error);

    tm.end();
  }, 2000);

}, 2000);

tm.then(() => {
  console.log('all tasks done!!!');
}, console.error);
