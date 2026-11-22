// Run: npm run test:logic  (compiles src/lib/calc.ts to a temp dir, then asserts)
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const os = require('node:os'), path = require('node:path'), fs = require('node:fs');
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'df-logic-'));
const root = path.join(__dirname, '..');
execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['tsc', '--ignoreConfig', '--outDir', out, '--module', 'commonjs', '--target', 'es2020', '--strict', '--skipLibCheck', '--lib', 'es2020,dom',
  path.join(root, 'src/lib/types.ts'), path.join(root, 'src/lib/calc.ts')], { stdio: 'inherit' });
const k = require(path.join(out, 'calc.js'));

assert.equal(k.parseHours('3.5'), 3.5);
assert.equal(k.parseHours('3h30'), 3.5);
assert.equal(k.parseHours('3:30'), 3.5);
assert.equal(k.parseHours('90m'), 1.5);
assert.equal(k.parsePay('84', 3.5), 84);
assert.equal(k.parsePay('14/hr', 3.5), 49);
assert.equal(k.parseTimeInput('6am'), '06:00');
assert.equal(k.parseTimeInput('6:30 pm'), '18:30');
assert.equal(k.parseTimeInput('12am'), '00:00');
assert.equal(k.parseTimeInput('12pm'), '12:00');
assert.equal(k.parseTimeInput('18:00'), '18:00');
assert.equal(k.parseTimeInput('25:00'), '');
assert.equal(k.parseDateInput('2026-11-22'), '2026-11-22');
assert.equal(k.parseDateInput('11/22/26'), '2026-11-22');
assert.equal(k.parseDateInput('2/30/2026'), '');
assert.equal(k.irsRate('2026-03-01'), 0.725);
assert.equal(k.irsRate('2026-11-22'), 0.76);
assert.equal(k.rateFor('2026-11-22', '0.5'), 0.5);
assert.equal(k.fmtClock(6), '6 AM');
assert.equal(k.fmtClock(13.5), '1:30 PM');
assert.equal(k.money(1234.5), '$1,234.50');

const mk = (o) => ({ id: Math.random().toString(36), type: 'block', platform: 'flex', status: 'done', date: '2026-11-10', start: '06:00', hours: 4, pay: 80, tips: 10, miles: 20, orders: 0, station: '', note: '', who: 'u1', ...o });
const s = k.sumBlocks([mk({}), mk({ platform: 'doordash', orders: 5, pay: 40, tips: 20, hours: 2, miles: 10 })]);
assert.equal(s.gross, 150);
assert.equal(s.hours, 6);
assert.equal(s.deduct, 22.8); // 30 mi * 0.76
assert.equal(s.perOrder, 12); // (40+20)/5

const e = [mk({ id: 'a', status: 'planned', date: '2030-01-01' }), mk({ id: 'b', status: 'planned', date: '2030-01-01' }), mk({ id: 'c', status: 'planned', date: '2030-01-02' })];
assert.deepEqual(k.dupIds(e), ['b']);
assert.equal(k.problems([mk({ date: '2030-01-01', status: 'done' })], new Date(2026, 10, 22)).future.length, 1);

const ex = [{ id: 'x', type: 'expense', platform: 'all', date: '2026-11-10', amt: 40, cat: 'Gas', note: '', who: 'u1' }, { id: 'y', type: 'expense', platform: 'flex', date: '2026-11-11', amt: 15.5, cat: 'Phone', note: '', who: 'u1' }];
const es = k.sumExpenses(ex);
assert.equal(es.total, 55.5); assert.equal(es.veh, 40); assert.equal(es.other, 15.5);
const csv = k.buildCsv([mk({ note: 'a, "b"' }), ...ex], 2026, () => 'Fully', '', new Date(2026, 10, 22));
assert.equal(csv.split('\n').length, 4);
assert.ok(csv.includes('"a, ""b"""'));

const L = { plat: 'doordash', start: 0, paused: 0, pausedMs: 0, rate: 13.25, deliveries: [{ ts: 1, pay: 8, tip: 2, mi: 3 }] };
const ls = k.liveSum(L, 3600000);
assert.equal(ls.gross, 10); assert.equal(ls.base, 13.25); assert.equal(ls.perHr, 10);
const nw = k.nextWindow(k.GENERAL_WINDOWS, new Date(2026, 10, 22, 10, 0));
assert.equal(nw.live, true);
assert.ok(csv.split('\n')[0].includes('base_pay,tips,total'));
// tips inside the total: DoorDash $70 with $20 tips is $70, not $90
let sp = k.splitPay(70, 20, true);
assert.deepEqual([sp.base, sp.tips, sp.total, sp.bad], [50, 20, 70, false]);
// tips on top: $100 pay + $50 tips is $150
sp = k.splitPay(100, 50, false);
assert.deepEqual([sp.base, sp.tips, sp.total, sp.bad], [100, 50, 150, false]);
// tips larger than the total are rejected
assert.equal(k.splitPay(10, 20, true).bad, true);
// no tips
sp = k.splitPay(84, 0, true);
assert.deepEqual([sp.base, sp.tips, sp.total], [84, 0, 84]);
// float safety
sp = k.splitPay(70.1, 20.1, true);
assert.equal(sp.base, 50);
console.log('logic tests passed');
