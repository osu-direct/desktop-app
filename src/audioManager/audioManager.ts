import { PlatformImplementation, Status, VsNode, VsStreamNode } from "./types";
import { exec, ExecException } from "child_process";
import path from "path";

const EXE_NAME = "vsExec.exe";

function toElectronPath(path: string): string {
  return path.replace("app.asar", "app.asar.unpacked");
}

const execCommand = (cmd: string, args: string[]): Promise<string> =>
  new Promise((resolve, reject) => {
    exec(
      `${cmd} ${
        args
          .map((arg) => typeof arg === "string" ? `"${arg}"` : arg)
          .join(" ")
      }`,
      (err: ExecException, stdout: string, stderr: string) => {
        if (err || stderr) {
          reject(stderr);
        } else {
          resolve(stdout);
        }
      },
    );
  });

function execVsCmd(args: string[]) {
  return execCommand(
    toElectronPath(path.join(__dirname, "bin", EXE_NAME)),
    args,
  ).catch((err) => {
    console.error(`Failed to execute vsExec.exe with args: ${args.join(" ")}`);
    console.error(err);
    throw new Error("Failed to execute vsExec.exe");
  });
}

export const windowsSoundManager: PlatformImplementation = {
  getPlatformCompatibility: () => ({
    status: true,
    listStreams: true,
    listSinks: true,
    listSources: true,
    setStreamVolume: true,
    setSinkVolume: true,
    setSourceVolume: true,
  }),
  async getGlobalVolume() {
    const res = await execVsCmd(["getGlobalVolume"]);
    const volume = parseInt(res.trim());

    if (isNaN(volume) || volume === -1) throw new Error("Failed to get volume");
    return volume;
  },
  async setGlobalVolume(volume: number) {
    if (volume < 0 || volume > 100) {
      throw new Error("Volume must be between 0 and 100");
    }

    await execVsCmd(["setGlobalVolume", volume.toString()]);
  },
  async isGlobalMuted() {
    const res = await execVsCmd(["isGlobalMuted"]);
    return res.trim() === "1";
  },
  async setGlobalMuted(muted: boolean) {
    await execVsCmd(["setGlobalMuted", muted ? "1" : "0"]);
  },
  async getStatus() {
    const sinksStr = await execVsCmd(["getSinks"]);
    const sourcesStr = await execVsCmd(["getSources"]);
    const streamsStr = await execVsCmd(["getStreams"]);
    try {
      const sinks = JSON.parse(sinksStr) as VsNode[];
      const sources = JSON.parse(sourcesStr) as VsNode[];
      const streams = JSON.parse(streamsStr) as VsStreamNode[];

      const status: Status = {
        sinks,
        sources,
        streams,

        defaultSink: sinks.find((sink: VsNode) => sink.isDefault)?.id,
        defaultSource: sources.find((source: VsNode) => source.isDefault)?.id,
      };

      return status;
    } catch (e) {
      console.error(streamsStr);
      throw new Error("Failed to get status");
    }
  },
  async getNodeVolumeInfoById(id: string) {
    const volumeStr = await execVsCmd([
      "getVolumeById",
      id.replace(/\\/g, "\\\\"),
    ]);
    const volume = parseInt(volumeStr.trim());
    if (isNaN(volume) || volume === -1) throw new Error("Failed to get volume");

    const mutedStr = await execVsCmd([
      "isMutedById",
      id.replace(/\\/g, "\\\\"),
    ]);
    const muted = mutedStr.trim() === "1";
    if (mutedStr.trim() !== "0" && !muted) {
      throw new Error("Failed to get muted");
    }

    return {
      volume,
      muted,
    };
  },
  async setNodeVolumeById(id: string, volume: number) {
    if (volume < 0 || volume > 100) {
      throw new Error("Volume must be between 0 and 100");
    }

    await execVsCmd([
      "setVolumeById",
      id.replace(/\\/g, "\\\\"),
      volume.toString(),
    ]);
  },
  async setNodeMutedById(id: string, muted: boolean) {
    await execVsCmd([
      "setMutedById",
      id.replace(/\\/g, "\\\\"),
      muted ? "1" : "0",
    ]);
  },
};
