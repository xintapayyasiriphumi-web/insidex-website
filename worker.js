// INSIDEX — Worker in front of the static assets, for /assets/video/* only
// (wrangler.jsonc "run_worker_first"). Everything else is served by static assets directly.
//
// Static assets answer a Range request with the whole file (200). Safari on iPhone/iPad
// requests video in byte ranges and will not play it without 206 Partial Content, so this
// slices the asset to the requested range. Not uploaded as an asset (.assetsignore allowlist).

export default {
  async fetch(request, env) {
    const res = await env.ASSETS.fetch(request);
    if (res.status !== 200 || (request.method !== 'GET' && request.method !== 'HEAD')) return res;

    const headers = new Headers(res.headers);
    headers.set('Accept-Ranges', 'bytes');
    const range = request.headers.get('Range');
    if (!range) return new Response(res.body, { status: 200, headers });

    const body = await res.arrayBuffer();
    const size = body.byteLength;
    headers.delete('Content-Encoding');   // the body is sliced decoded

    // One range only: "bytes=start-end", "bytes=start-" or "bytes=-suffix".
    // Anything else (several ranges, other units) gets the whole file, which the spec allows.
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!m || (m[1] === '' && m[2] === '')) {
      headers.set('Content-Length', String(size));
      return new Response(request.method === 'HEAD' ? null : body, { status: 200, headers });
    }

    let start;
    let end;
    if (m[1] === '') {
      start = Math.max(0, size - Number(m[2]));
      end = size - 1;
    } else {
      start = Number(m[1]);
      end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
    }

    if (start >= size || start > end) {
      headers.set('Content-Range', `bytes */${size}`);
      headers.delete('Content-Length');
      return new Response(null, { status: 416, headers });
    }

    headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
    headers.set('Content-Length', String(end - start + 1));
    return new Response(request.method === 'HEAD' ? null : body.slice(start, end + 1), { status: 206, headers });
  },
};
