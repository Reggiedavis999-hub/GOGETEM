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

// live dash: plays with their own base rates
const T0 = new Date(2026, 10, 25, 17, 41).getTime(), MIN = 60000;
const L = { plat: 'doordash', start: T0, paused: 0, pausedMs: 0, plays: [
  { id: 'a', start: T0 + 2 * MIN, end: T0 + 22 * MIN, rate: 14.25, deliveries: 2, total: 19.53 },
  { id: 'b', start: T0 + 30 * MIN, end: T0 + 50 * MIN, rate: 18.75, deliveries: 1, total: 12 },
] };
const ls = k.liveStats(L, T0 + 60 * MIN);
assert.equal(ls.total, 31.53);
assert.equal(ls.dashMs, 60 * MIN);
assert.equal(ls.activeMs, 40 * MIN);
assert.equal(ls.deadMs, 20 * MIN);
assert.equal(ls.deliveries, 3);
assert.equal(ls.base, 11); // 14.25 for its 20 min + 18.75 for its 20 min: 4.75 + 6.25
assert.equal(ls.above, 20.53);
assert.equal(k.c2(ls.perHrDash), 31.53);
assert.equal(k.c2(ls.perHrActive), 47.3);
assert.equal(k.c2(ls.perPlay), 15.77);
// the number that looked wrong: $19.53 in the first 27:08 of a dash is $43.19/hr on the dash clock
const early = k.dashStats([{ id: 'z', start: T0, end: T0 + 20 * MIN, rate: 14.25, deliveries: 2, total: 19.53 }], 27 * MIN + 8000, 0, T0 + 27 * MIN);
assert.equal(k.c2(early.perHrDash), 43.19);
// pause does not count toward the dash clock
assert.equal(k.liveDashMs({ ...L, pausedMs: 10 * MIN }, T0 + 60 * MIN), 50 * MIN);
assert.equal(k.liveDashMs({ ...L, paused: T0 + 40 * MIN }, T0 + 90 * MIN), 40 * MIN);
// an open play counts as active time and accrues base, but not money
const open = { ...L, plays: [...L.plays, { id: 'c', start: T0 + 55 * MIN, rate: 20, deliveries: 1, total: 0 }] };
const ops = k.liveStats(open, T0 + 60 * MIN);
assert.equal(ops.total, 31.53); assert.equal(ops.activeMs, 45 * MIN); assert.equal(ops.done, 2);
assert.equal(k.openPlay(open).id, 'c'); assert.equal(k.openPlay(L), undefined);
// a dash running before the update keeps its deliveries as plays
const mg = k.migrateLive({ plat: 'doordash', start: T0, paused: 0, pausedMs: 0, rate: 13.25, deliveries: [{ ts: T0 + MIN, pay: 8, tip: 2, mi: 3 }, { ts: T0 + 9 * MIN, pay: 5, tip: 0, mi: 2 }] });
assert.equal(mg.plays.length, 2); assert.equal(mg.plays[0].total, 10); assert.equal(mg.miles, 5); assert.equal(mg.tips, 2);
assert.equal(k.migrateLive({ plat: 'doordash', start: T0, plays: [] }).plays.length, 0);
assert.equal(k.migrateLive({ foo: 1 }), null);
// saved block numbers come from the plays; tips stay inside the total
const df = k.dashFields({ start: T0, end: T0 + 120 * MIN, pausedMs: 10 * MIN, plays: L.plays }, 4, 22.5);
assert.deepEqual([df.date, df.start, df.hours, df.pay, df.tips, df.miles, df.orders], ['2026-11-25', '17:41', 1.83, 27.53, 4, 22.5, 3]);
assert.equal(k.dashFields({ start: T0, end: T0 + 60 * MIN, pausedMs: 0, plays: L.plays }, 99, 0).tips, 31.53); // tips never above the total
// editor: build, overlap, outside the dash, past midnight
const row = (o) => ({ id: 'r' + Math.random(), rate: 18.75, deliveries: 1, startHM: '5:45 PM', endHM: '6:10 PM', total: 12, ...o });
let bd = k.buildDash({ date: '2026-11-25', startHM: '5:41 PM', endHM: '8:00 PM', pausedMs: 0, tips: 3, miles: 20, rows: [row({}), row({ startHM: '6:30 PM', endHM: '7:00 PM', total: 15 })] });
assert.equal(bd.ok, true); assert.equal(bd.fields.pay, 24); assert.equal(bd.fields.tips, 3); assert.equal(bd.fields.orders, 2); assert.equal(bd.fields.hours, 2.32);
assert.equal(k.buildDash({ date: '2026-11-25', startHM: '5:41 PM', endHM: '8:00 PM', pausedMs: 0, tips: 0, miles: 0, rows: [row({}), row({ startHM: '6:00 PM', endHM: '6:20 PM' })] }).ok, false);
assert.equal(k.buildDash({ date: '2026-11-25', startHM: '5:41 PM', endHM: '8:00 PM', pausedMs: 0, tips: 0, miles: 0, rows: [row({ startHM: '4:00 PM', endHM: '4:30 PM' })] }).ok, false);
assert.equal(k.buildDash({ date: '2026-11-25', startHM: '5:41 PM', endHM: '8:00 PM', pausedMs: 0, tips: 50, miles: 0, rows: [row({})] }).ok, false);
bd = k.buildDash({ date: '2026-11-25', startHM: '11:00 PM', endHM: '1:30 AM', pausedMs: 0, tips: 0, miles: 0, rows: [row({ startHM: '11:30 PM', endHM: '12:15 AM' })] });
assert.equal(bd.ok, true); assert.equal(bd.fields.hours, 2.5);
// a plain block becomes one play
const fb = k.dashFromBlock(mk({ platform: 'doordash', orders: 3, pay: 40, tips: 5, hours: 2 }));
assert.equal(fb.plays.length, 1); assert.equal(fb.plays[0].total, 45); assert.equal(fb.plays[0].deliveries, 3);
// notes assistant: it names the numbers, the app adds them
const st0 = { miles: 84, tips: 0, total: 0, plays: L.plays.map((p) => ({ ...p })), expenses: [] };
let ap = k.applyAssist(st0, [{ kind: 'add_miles', value: 12 }]);
assert.equal(ap.next.miles, 96); assert.deepEqual(ap.errors, []);
ap = k.applyAssist(st0, [{ kind: 'add_total', value: 6, tip: true }]);
assert.equal(ap.next.total, 37.53); assert.equal(ap.next.tips, 6); assert.equal(ap.next.plays[1].total, 18);
ap = k.applyAssist(st0, [{ kind: 'play_total', play: 1, value: -4.5 }]);
assert.equal(ap.next.plays[0].total, 15.03); assert.equal(ap.next.total, 27.03);
assert.equal(k.applyAssist(st0, [{ kind: 'play_total', play: 9, value: 1 }]).errors.length, 1);
assert.equal(k.applyAssist(st0, [{ kind: 'add_miles', value: -100 }]).errors.length, 1);
ap = k.applyAssist(st0, [{ kind: 'set_miles', value: 70 }, { kind: 'add_expense', value: 31, cat: 'Gas', note: 'fill up' }, { kind: 'add_expense', value: 5, cat: 'Nonsense' }]);
assert.equal(ap.next.miles, 70); assert.equal(ap.next.expenses.length, 2); assert.equal(ap.next.expenses[1].cat, 'Other');
const st1 = { miles: 10, tips: 0, total: 50, plays: [], expenses: [] };
ap = k.applyAssist(st1, [{ kind: 'add_total', value: 5, tip: true }]);
assert.equal(ap.next.total, 55); assert.equal(ap.next.tips, 5);
assert.equal(k.applyAssist(st0, [{ kind: 'add_miles', value: NaN }]).errors.length, 1);
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
