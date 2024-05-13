import childProcess from "child_process";

export const runFile = (
  folder: string,
  file: string,
  args: string[],
): Promise<boolean> => {
  return new Promise<boolean>((res) => {
    childProcess.execFile(file, args, {
      cwd: folder,
    }, (err) => {
      res(err == null);
    });
  });
};
