import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createTokenGuard} from './token-guard.mjs';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'token-guard-test-'));
test('zero budget blocks paid requests before API usage',()=>{
 const guard=createTokenGuard({CLOUD_DAILY_TOKEN_LIMIT:'0'},path.join(temp,'zero.json'));
 assert.throws(()=>guard.reserve('hello'),/disabled/);
});
test('reservation reconciles with provider usage',()=>{
 const guard=createTokenGuard({},path.join(temp,'usage.json'));
 const reserved=guard.reserve('hello');
 assert.ok(reserved>350);
 guard.settle(reserved,15);
 assert.equal(guard.stats().dailyTokens,15);
});
test('daily limit stops requests before cloud call',()=>{
 const guard=createTokenGuard({CLOUD_DAILY_TOKEN_LIMIT:'300'},path.join(temp,'limit.json'));
 assert.throws(()=>guard.reserve('hello'),/exhausted/);
});
test('matching requests can be reused for a short time',()=>{
 const guard=createTokenGuard({},path.join(temp,'cache.json'));
 guard.remember('model','hello','response');
 assert.equal(guard.cached('model','hello'),'response');
 assert.equal(guard.cached('model','other'),null);
});
test('invalid usage ledger blocks paid requests',()=>{
 const filename=path.join(temp,'bad.json');
 fs.writeFileSync(filename,'not-json');
 const guard=createTokenGuard({},filename);
 assert.throws(()=>guard.reserve('hello'),/could not be read/);
});
