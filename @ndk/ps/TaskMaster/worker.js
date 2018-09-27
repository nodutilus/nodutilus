'use strict';
const consts = require('./consts');
const file = process.env['@ndk/ps/TaskMaster:file'];
const worker_module = require(file);
const worker_method = process.env['@ndk/ps/TaskMaster:method'];
const master = {
  add(task) {
    process.send({
      event: consts.EV_ADD_TASK,
      data: task
    });
  }
};
const msg_handler = {
  async [consts.EV_SET_TASK](task) {
    try {
      process.send({
        event: consts.EV_DONE_TASK,
        data: await worker_module[worker_method](task, master)
      });
    } catch (err) {
      if (err instanceof Error) {
        process.send({
          event: consts.EV_ERROR,
          data: {
            code: err.code,
            name: err.name,
            message: err.message,
            stack: err.stack,
            errno: err.errno,
            syscall: err.syscall,
            path: err.path,
            address: err.address,
            port: err.port
          }
        });
      } else {
        process.send({
          event: consts.EV_ERROR,
          data: err
        });
      }
    }
    process.send({ event: consts.EV_GET_TASK });
  }
};

if (!(worker_method in worker_module)) {
  throw new Error(`Method ${worker_method} not found in module ${file}`);
}
process.on('message', (msg) => msg_handler[msg.event](msg.data));
process.send({ event: consts.EV_GET_TASK });
