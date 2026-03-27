#!/usr/bin/env node

const BASE_URL = (process.env.TARGET_URL || "https://minutka2-production.up.railway.app").replace(/\/$/, "");

const PROFILES = [
  { name: "light", concurrency: 20, durationSec: 30 },
  { name: "medium", concurrency: 60, durationSec: 30 },
  { name: "heavy", concurrency: 120, durationSec: 30 },
];

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function requestOnce(pool) {
  const endpoint = pool[Math.floor(Math.random() * pool.length)];
  const started = performance.now();
  let ok = false;
  let status = 0;
  try {
    const res = await fetch(`${BASE_URL}${endpoint.path}`, endpoint.init);
    status = res.status;
    ok = res.ok;
    await res.arrayBuffer();
  } catch {
    ok = false;
  }
  const latencyMs = performance.now() - started;
  return { ok, status, latencyMs, name: endpoint.name };
}

async function runProfile(profile, endpoints) {
  const endAt = Date.now() + profile.durationSec * 1000;
  const latencies = [];
  const byEndpoint = new Map();
  let total = 0;
  let failed = 0;

  async function worker() {
    while (Date.now() < endAt) {
      const result = await requestOnce(endpoints);
      total += 1;
      latencies.push(result.latencyMs);
      if (!result.ok) failed += 1;
      if (!byEndpoint.has(result.name)) {
        byEndpoint.set(result.name, { total: 0, failed: 0 });
      }
      const current = byEndpoint.get(result.name);
      current.total += 1;
      if (!result.ok) current.failed += 1;
    }
  }

  const workers = [];
  for (let i = 0; i < profile.concurrency; i += 1) workers.push(worker());
  await Promise.all(workers);

  latencies.sort((a, b) => a - b);
  const rps = total / profile.durationSec;
  return {
    name: profile.name,
    concurrency: profile.concurrency,
    durationSec: profile.durationSec,
    total,
    failed,
    errorRate: total ? (failed / total) * 100 : 0,
    rps,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    byEndpoint: Array.from(byEndpoint.entries()).map(([name, s]) => ({
      name,
      total: s.total,
      failed: s.failed,
      errorRate: s.total ? (s.failed / s.total) * 100 : 0,
    })),
  };
}

async function main() {
  const restaurantsRes = await fetch(`${BASE_URL}/restaurants`);
  const restaurants = (await restaurantsRes.json().catch(() => [])) || [];
  const firstId = Array.isArray(restaurants) && restaurants.length ? restaurants[0].id : null;
  if (!firstId) {
    throw new Error("No restaurants returned from /restaurants, benchmark cannot continue.");
  }

  const endpoints = [
    { name: "restaurants", path: "/restaurants", init: { method: "GET" } },
    { name: "featured", path: "/restaurants/featured", init: { method: "GET" } },
    { name: "banners", path: "/banners", init: { method: "GET" } },
    { name: "restaurant_detail", path: `/restaurants/${firstId}`, init: { method: "GET" } },
    { name: "visit", path: "/visit", init: { method: "POST" } },
  ];

  const results = [];
  for (const profile of PROFILES) {
    // eslint-disable-next-line no-console
    console.log(`Running profile ${profile.name} (c=${profile.concurrency}, ${profile.durationSec}s)...`);
    const result = await runProfile(profile, endpoints);
    results.push(result);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(result, null, 2));
  }

  // eslint-disable-next-line no-console
  console.log("\nSummary:");
  for (const r of results) {
    // eslint-disable-next-line no-console
    console.log(
      `${r.name}: RPS=${r.rps.toFixed(1)}, error=${r.errorRate.toFixed(2)}%, p50=${r.p50.toFixed(
        1,
      )}ms, p95=${r.p95.toFixed(1)}ms, p99=${r.p99.toFixed(1)}ms`,
    );
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("Benchmark failed:", e?.message || String(e));
  process.exit(1);
});

