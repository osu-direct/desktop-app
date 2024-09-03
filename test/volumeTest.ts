import * as volumeUtil from "../src/volumeUtil";

(async () => {
  volumeUtil.muteApp("osu!");
  await new Promise((res) => setTimeout(res, 2500));
  volumeUtil.unmuteApp("osu!");
})();
