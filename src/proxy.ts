import MITMProxy from './mitm/mitm-proxy';

// Returns Promise<MITMProxy>
async function makeProxy() {
  // Note: Your interceptor can also be asynchronous and return a Promise!
  return MITMProxy.Create(function(interceptedMsg) {
    const req = interceptedMsg.request;
    const res = interceptedMsg.response;
    console.log("REQUEST:", req, res);
  });
}

export async function main() {
  const proxy = await makeProxy();
  // when done:
  await proxy.shutdown();
}