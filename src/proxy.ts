/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import MITMProxy from './mitm/mitm-proxy';

// Returns Promise<MITMProxy>
async function makeProxy() {
  // Note: Your interceptor can also be asynchronous and return a Promise!
  return MITMProxy.Create(async function (interceptedMsg) {
    const req = interceptedMsg.request;
    const res = interceptedMsg.response;
    //console.log("Request:", req, res);
    const userAgent = req.headers.find((valkey) => valkey[0] == "User-Agent");
    if (userAgent && userAgent[1] == "osu!") {
      if (req.url.pathname == "/web/osu-search.php") {
        const originalUrlParams = new URLSearchParams(req.url.query.toString());
        const query = originalUrlParams.get("q");
        const page = Number.parseInt(originalUrlParams.get("p"));
        const offset = page * 100;
        const mode = Number.parseInt(originalUrlParams.get("m"));
        let status = Number.parseInt(originalUrlParams.get("r"));
        const params = new URLSearchParams();
        params.set("amount", "100");
        params.set("offset", offset + "");
        params.set("osudirect", "1");

        if (status != 4) {
          switch (status) {
            case 0: // Ranked
              status = 1;
              break;
            case 2: // Pending
              status = 0;
              break;
            case 3: // Qualified
              status = 3;
              break;
            case 5: // Pending
              status = 0;
              break;
            case 7: // played before, Ranked
              status = 1;
              break;
            case 8: // loved
              status = 4;
              break;
          }
          params.set("status", status + "");
        }
        if (mode > -1 && mode <= 3) params.set("mode", mode + "")
        if (query != "Newest" && query != "Top+Rated" && query != "Most+Played") params.set("query", query);

        const newURL = "https://osu.direct/api/search?" + params;
        console.log(newURL)
        const apiResult = await fetch(newURL);
        if (!apiResult.ok || apiResult.status != 200) {
          interceptedMsg.setResponseBody(Buffer.from(`-1\nThis request has been hijacked by osu.direct`, 'utf8'));
          return;
        }
        interceptedMsg.setResponseBody(Buffer.from(`-1\nThis request has been hijacked by osu.direct`, 'utf8'));
        const ye = await apiResult.text();
        console.log(ye);
      }
      //console.log("REQUEST:", req);
    }
  });
}

export async function main() {
  const proxy = await makeProxy();
  // when done:
  await proxy.shutdown();
}