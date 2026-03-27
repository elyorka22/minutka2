#!/usr/bin/env node

const BASE_URL = (process.env.TARGET_URL || "https://minutka2-production.up.railway.app").replace(/\/$/, "");

const RUNS = Math.min(Math.max(Number(process.env.RUNS ?? 10) || 10, 1), 15);
const DELAY_MS = Math.min(Math.max(Number(process.env.DELAY_MS ?? 5000) || 5000, 1000), 20000);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function jsonOrNull(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function main() {
  // eslint-disable-next-line no-console
  console.log(
    `Checkout benchmark will CREATE ${RUNS} real orders on ${BASE_URL}. Delay=${DELAY_MS}ms (keeps under rate-limit).`,
  );

  const restaurantsRes = await fetch(`${BASE_URL}/restaurants`);
  if (!restaurantsRes.ok) throw new Error(`Failed /restaurants: ${restaurantsRes.status}`);
  const restaurants = (await jsonOrNull(restaurantsRes)) || [];
  if (!Array.isArray(restaurants) || !restaurants.length) {
    throw new Error("No restaurants found for benchmark.");
  }

  let restaurantId = null;
  let dishId = null;
  for (let i = 0; i < Math.min(restaurants.length, 15); i += 1) {
    const candidateId = restaurants[i]?.id;
    if (!candidateId) continue;
    const dishesRes = await fetch(`${BASE_URL}/restaurants/${candidateId}/dishes`);
    if (!dishesRes.ok) continue;
    const dishes = (await jsonOrNull(dishesRes)) || [];
    const d0 = Array.isArray(dishes) && dishes.length ? dishes[0]?.id : null;
    if (d0) {
      restaurantId = candidateId;
      dishId = d0;
      break;
    }
  }
  if (!restaurantId || !dishId) throw new Error("No restaurant with dishes found for benchmark.");

  const latencies = [];
  let failed = 0;

  for (let i = 0; i < RUNS; i += 1) {
    const body = {
      restaurantId,
      address: {
        street: "Bench street",
        city: "Chust",
        label: "bench",
        details: "Tel: +0000000000",
        latitude: 0,
        longitude: 0,
      },
      items: [{ dishId, quantity: 1 }],
      comment: "benchmark",
      paymentMethod: "CASH",
      clientKey: `bench-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    };

    const started = performance.now();
    const res = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const latencyMs = performance.now() - started;
    latencies.push(latencyMs);

    if (!res || !res.ok) {
      failed += 1;
      const status = res ? res.status : 0;
      const err = res ? await jsonOrNull(res) : null;
      // eslint-disable-next-line no-console
      console.log(
        `#${i + 1}/${RUNS}: FAIL status=${status} latency=${latencyMs.toFixed(1)}ms message=${
          err?.message ? String(err.message) : "-"
        }`,
      );
    } else {
      const created = await jsonOrNull(res);
      // eslint-disable-next-line no-console
      console.log(
        `#${i + 1}/${RUNS}: OK latency=${latencyMs.toFixed(1)}ms orderId=${String(created?.id ?? "").slice(0, 8)}`,
      );
    }

    if (i !== RUNS - 1) await sleep(DELAY_MS);
  }

  latencies.sort((a, b) => a - b);
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);

  // eslint-disable-next-line no-console
  console.log("\nSummary:");
  // eslint-disable-next-line no-console
  console.log(
    `runs=${RUNS}, failed=${failed} (${((failed / RUNS) * 100).toFixed(2)}%), p50=${p50.toFixed(
      1,
    )}ms, p95=${p95.toFixed(1)}ms, p99=${p99.toFixed(1)}ms`,
  );
  // eslint-disable-next-line no-console
  console.log("Note: throughput is capped by server rate-limit on POST /orders (15/min).");
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("Benchmark failed:", e?.message || String(e));
  process.exit(1);
});

