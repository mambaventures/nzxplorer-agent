import { config } from 'dotenv';
config();

const BASE_URL = process.env.NZXPLORER_API_URL || 'https://nzxplorer.co.nz';
const API_KEY = process.env.NZXPLORER_API_KEY;

async function test(endpoint, label) {
  const url = `${BASE_URL}${endpoint}&format=llm`;
  console.log(`\n--- ${label} ---`);
  console.log(`GET ${url}`);
  try {
    const res = await fetch(url, { headers: { 'X-API-Key': API_KEY } });
    if (!res.ok) {
      console.log(`ERROR: ${res.status} ${res.statusText}`);
      return;
    }
    const data = await res.json();
    const preview = JSON.stringify(data).slice(0, 300);
    console.log(`OK (${res.status}) — ${preview}...`);
  } catch (err) {
    console.log(`FAILED: ${err.message}`);
  }
}

console.log(`NZXplorer API: ${BASE_URL}`);
console.log(`API Key: ${API_KEY?.slice(0, 10)}...`);

await test('/api/v1/companies?search=air+new+zealand&limit=1', 'Company search');
await test('/api/v1/companies/AIR?include=governance,price', 'Company detail (AIR)');
await test('/api/v1/governance?limit=3', 'Governance scores (top 3)');
await test('/api/v1/insider-trades?ticker=AIR&limit=3', 'Insider trades (AIR)');
await test('/api/v1/financials/AIR?statement=income&limit=2', 'Financials (AIR income)');
await test('/api/v1/metrics/AIR?mode=snapshot', 'Metrics snapshot (AIR)');
await test('/api/v1/dividends/AIR?limit=3', 'Dividends (AIR)');
await test('/api/v1/earnings/AIR?limit=2', 'Earnings (AIR)');
await test('/api/v1/announcements?ticker=AIR&limit=2', 'Announcements (AIR)');
await test('/api/v1/directors?company=AIR&current=true', 'Directors (AIR current)');
await test('/api/v1/prices/AIR?days=5', 'Prices (AIR last 5 days)');

console.log('\n--- ALL TESTS COMPLETE ---');
