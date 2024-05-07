import childProcess from "child_process";

export const runFile = (folder: string, file: string, args: string[]) => {
  childProcess.execFile(file, args, {
    cwd: folder,
  });
};
