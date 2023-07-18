import { spawn } from 'child_process';
import * as path from 'path';

(async () => {
  const ls = spawn("npm", ["run", process.platform === "win32" ? "win:compile" : "linux:compile"], { cwd: path.join(__dirname), shell: true });

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
})();