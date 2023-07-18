import { spawn } from 'child_process';
import * as path from 'path';

(async () => {
  const ls = spawn("npm", ["run", process.platform === "win32" ? "win:start" : "linux:start"], { cwd: path.join(__dirname), shell: true });

  ls.stdout.on('data', function (data) {
    if (data.toString().length > 0)
      console.log(data.toString());
  });

  ls.stderr.on('data', function (data) {
    if (data.toString().length > 0)
      console.log(data.toString());
  });

  ls.on('exit', function (code) {
    console.log('child process exited with code ' + code?.toString());
  });

  ls.on('error', function (code) {
    console.log(code?.toString());
  });

  function exitHandler() {
    ls.kill("SIGINT");
    process.exit(1);
  }

  //do something when app is closing
  process.on('exit', exitHandler.bind(null));

  //catches ctrl+c event
  process.on('SIGINT', exitHandler.bind(null));

  // catches "kill pid" (for example: nodemon restart)
  process.on('SIGUSR1', exitHandler.bind(null));
  process.on('SIGUSR2', exitHandler.bind(null));

  //catches uncaught exceptions
  process.on('uncaughtException', exitHandler.bind(null));
})();