import { windowsSoundManager } from "./audioManager";

export const toggleOsuSound = async (mute: boolean) => {
  const status = await windowsSoundManager.getStatus();
  const osuStream = status.streams.find((stream) => stream.name == "osu!.exe");
  if (osuStream) {
    windowsSoundManager.setNodeMutedById(osuStream.id, mute);
  }
};
