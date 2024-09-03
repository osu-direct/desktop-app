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

export const runFileDetached = (
  folder: string,
  file: string,
  args?: string[],
): Promise<boolean> => {
  return new Promise<boolean>((res) => {
    const process = childProcess.spawn(file, args, {
      cwd: folder,
      detached: true,
      stdio: "ignore",
    });
    process.stdout.on("data", (yes) => {
      console.log(yes);
    });
    process.on("exit", (code) => {
      console.log("exited with code", code);
    });
    process.unref();
    res(true);
  });
};
