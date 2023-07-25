/* eslint-disable @typescript-eslint/no-unused-vars */
import MITMProxy from './mitm/mitm-proxy';

// Returns Promise<MITMProxy>
async function makeProxy() {
  // Note: Your interceptor can also be asynchronous and return a Promise!
  return MITMProxy.Create(function (interceptedMsg) {
    const req = interceptedMsg.request;
    const res = interceptedMsg.response;
    //console.log("Request:", req, res);
    const userAgent = req.headers.find((valkey) => valkey[0] == "User-Agent")
    if (userAgent && userAgent[1] == "osu!")
      console.log("REQUEST:", req);
  });
}

export async function main() {
  const proxy = await makeProxy();
  // when done:
  await proxy.shutdown();
}