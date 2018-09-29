'use strict';

module.exports.runTask = async function (task, master) {
  return await new Promise((resolve) => {
    if (task.name === 'task1') {
      master.add({ name: 'internal task1' });
    }
    setTimeout(() => {
      resolve({ done: task.name });
      if (task.name === 'arr_task4') {
        master.add([{ name: 'internal arr_task2' }, { name: 'internal arr_task3' }]);
      }
    }, 1000);
  });
};
