import MITMProxy from 'mitmproxy';

async function makeProxy() {
  // Note: Your interceptor can also be asynchronous and return a Promise!
  return MITMProxy.Create(function (interceptedMsg) {
    const req = interceptedMsg.request;
    const res = interceptedMsg.response;
    console.log(req, res);
  }, [] /* list of paths to directly intercept -- don't send to server */,
    false /* Be quiet; turn off for debug messages */,
    false /* Only intercept text or potentially-text requests (all mime types with *application* and *text* in them, plus responses with no mime type) */
  );
}

export async function initMitm() {
  const proxy = await makeProxy();
  // when done:
  await proxy.shutdown();
}