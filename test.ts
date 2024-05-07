import { volumeControl } from "volume_supervisor";

(async () => {
  const statuses = await volumeControl.getStatus();
  console.log(statuses);
});
