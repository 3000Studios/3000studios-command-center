import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const number = (value, fallback, min, max) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? Math.floor(n) : fallback;
};
const day = () => new Date().toISOString().slice(0, 10);
const month = () => day().slice(0, 7);
const blank = () => ({day: day(), month: month(), dailyTokens: 0, monthlyTokens: 0, requests: 0});
const cache = new Map();
const CACHE_MAX = 100;

export function createTokenGuard(env = process.env, stateFile = path.join(os.homedir(), '.3000studios', 'token-usage.json')) {
  const dailyLimit = number(env.CLOUD_DAILY_TOKEN_LIMIT, 5000, 0, 100000000);
  const monthlyLimit = number(env.CLOUD_MONTHLY_TOKEN_LIMIT, 50000, 0, 1000000000);
  const maxOutputTokens = number(env.CLOUD_MAX_OUTPUT_TOKENS, 350, 16, 4096);
  const ttl = number(env.CLOUD_CACHE_TTL_SECONDS, 60, 0, 3600) * 1000;
  function load() {
    let record;
    try { record = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch (err) {
      if (err.code === 'ENOENT') record = blank();
      else throw Error('Token usage ledger could not be read. Paid requests are blocked.');
    }
    if (!record || typeof record !== 'object') throw Error('Token ledger is invalid. Paid requests are blocked.');
    if (record.month !== month()) record = blank();
    if (record.day !== day()) record = {...record, day: day(), dailyTokens: 0};
    for (const key of ['dailyTokens', 'monthlyTokens', 'requests']) {
      if (!Number.isSafeInteger(record[key]) || record[key] < 0) throw Error('Token ledger is invalid. Paid requests are blocked.');
    }
    return record;
  }
  function store(record) {
    fs.mkdirSync(path.dirname(stateFile), {recursive: true, mode: 0o700});
    const temp = `${stateFile}.${process.pid}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(record), {mode: 0o600});
    fs.renameSync(temp, stateFile);
  }
  // Conservative request-size estimate: reserve budget before any paid provider call.
  function estimate(prompt) { return Math.ceil(Buffer.byteLength(prompt, 'utf8') / 2) + maxOutputTokens; }
  function reserve(prompt) {
    if (dailyLimit === 0 || monthlyLimit === 0) throw Error('Paid cloud token calls are disabled by budget policy.');
    const tokens = estimate(prompt);
    const record = load();
    if (record.dailyTokens + tokens > dailyLimit || record.monthlyTokens + tokens > monthlyLimit) {
      throw Error('Cloud token budget exhausted; request stopped before the provider call.');
    }
    record.dailyTokens += tokens;
    record.monthlyTokens += tokens;
    record.requests += 1;
    store(record);
    return tokens;
  }
  function settle(reserved, actual) {
    const billed = Number.isSafeInteger(actual) && actual >= 0 ? actual : reserved;
    const record = load();
    record.dailyTokens = Math.max(0, record.dailyTokens + billed - reserved);
    record.monthlyTokens = Math.max(0, record.monthlyTokens + billed - reserved);
    store(record);
  }
  function cacheKey(model, prompt) { return crypto.createHash('sha256').update(model + '\0' + prompt).digest('hex'); }
  function cached(model, prompt) {
    if (!ttl) return null;
    const id = cacheKey(model, prompt);
    const entry = cache.get(id);
    if (entry && Date.now() < entry.expires) return entry.text;
    cache.delete(id);
    return null;
  }
  function remember(model, prompt, result) {
    if (!ttl) return;
    cache.set(cacheKey(model, prompt), {text: result, expires: Date.now() + ttl});
    if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  }
  return {dailyLimit, monthlyLimit, maxOutputTokens, reserve, settle, cached, remember,
    stats: () => ({...load(), dailyLimit, monthlyLimit, maxOutputTokens, cacheEntries: cache.size})};
}
