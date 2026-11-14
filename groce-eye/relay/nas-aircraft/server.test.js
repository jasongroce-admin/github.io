import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createAircraftHandler} from './server.js';

async function withServer(handler, run) {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('returns a compact aircraft feed and shares cached quarter-degree cells', async () => {
  let calls = 0;
  const fetcher = async url => {
    calls++;
    assert.match(url, /\/lat\/39\.75\/lon\/-86\.25\/dist\/100$/);
    return new Response(JSON.stringify({now:1_700_000_000, ac:[
      {hex:'abc123', flight:'TEST1', lat:39.7, lon:-86.2, seen_pos:1, alt_baro:1000,
       gs:140, track:90, privateDetail:'discard'},
      {hex:'bad', lat:999, lon:0}
    ]}), {status:200});
  };
  await withServer(createAircraftHandler({fetcher}), async base => {
    const first = await fetch(`${base}/v1/aircraft?lat=39.77&lon=-86.18&r=100`,
      {headers:{Origin:'https://jasongroce.com'}});
    assert.equal(first.status, 200);
    assert.equal(first.headers.get('access-control-allow-origin'), 'https://jasongroce.com');
    assert.equal(first.headers.get('cache-control'), 'public, max-age=120');
    const body = await first.json();
    assert.equal(body.source, 'adsb.fi');
    assert.equal(body.ac.length, 1);
    assert.equal(body.ac[0].privateDetail, undefined);
    const second = await fetch(`${base}/aircraft?lat=39.79&lon=-86.24`);
    assert.equal(second.status, 200);
    assert.equal(calls, 1);
  });
});

test('rejects invalid requests and unapproved browser origins', async () => {
  await withServer(createAircraftHandler({fetcher:() => { throw new Error('unexpected fetch'); }}), async base => {
    for (const path of ['/v1/aircraft?lat=&lon=1', '/v1/aircraft?lat=91&lon=1',
      '/v1/aircraft?lat=1&lon=2&r=250']) {
      assert.equal((await fetch(base+path)).status, 400);
    }
    assert.equal((await fetch(`${base}/api/status`)).status, 404);
    assert.equal((await fetch(`${base}/v1/aircraft?lat=1&lon=2`,
      {headers:{Origin:'https://other.example'}})).status, 403);
    assert.equal((await fetch(`${base}/v1/aircraft?lat=1&lon=2`, {method:'POST'})).status, 405);
  });
});

test('limits upstream calls and serves a recent stale value on provider failure', async () => {
  let now = 1_700_000_000_000;
  let calls = 0;
  const fetcher = async () => {
    calls++;
    if (calls > 1) throw new Error('unavailable');
    return new Response(JSON.stringify({ac:[{hex:'abc123',lat:39.7,lon:-86.2}]}), {status:200});
  };
  await withServer(createAircraftHandler({fetcher,clock:() => now}), async base => {
    const path = '/v1/aircraft?lat=39.77&lon=-86.18';
    assert.equal((await fetch(base+path)).status, 200);
    assert.equal((await fetch(`${base}/v1/aircraft?lat=40&lon=-86`)).status, 429);
    now += 121_000;
    const stale = await fetch(base+path);
    assert.equal(stale.status, 200);
    assert.equal((await stale.json()).stale, true);
    assert.equal(calls, 2);
  });
});
