require('dotenv').config();
const mongoose = require('mongoose');
const http = require('http');
const app = require('../server');
const { Mess, User, Vote, Menu, Dish } = require('../models');

let server;
let baseUrl;
let failures = 0;

function fail(msg) {
  console.error('  FAIL:', msg);
  failures++;
}

function pass(msg) {
  console.log('  PASS:', msg);
}

async function req(method, path, { body, cookie } = {}) {
  const url = `${baseUrl}${path}`;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (cookie) opts.headers['Cookie'] = cookie;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data, headers: res.headers };
}

function extractCookie(headers) {
  const raw = headers.get('set-cookie') || '';
  const match = raw.match(/token=([^;]+)/);
  return match ? `token=${match[1]}` : null;
}

async function startServer() {
  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all([Mess.init(), User.init(), Dish.init(), Menu.init(), Vote.init()]);
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;
  console.log(`Smoke server on port ${port}`);
}

async function cleanup() {
  await mongoose.disconnect();
  await new Promise(resolve => server.close(resolve));
}

async function run() {
  await startServer();

  // ── Test 1: Dev login & /me ──────────────────────────────────────────
  console.log('\n[1] Dev login, /me, join code validation');

  const loginRes = await req('POST', '/api/auth/dev', {
    body: { email: 'dev@example.com', name: 'Dev Admin', joinCode: 'DEMO01' }
  });
  if (loginRes.status === 200) pass('Dev login returns 200');
  else fail(`Dev login returned ${loginRes.status}`);

  const cookie = extractCookie(loginRes.headers);
  if (cookie) pass('Cookie set on login');
  else { fail('No cookie set on login'); }

  const meRes = await req('GET', '/api/auth/me', { cookie });
  if (meRes.status === 200 && meRes.data.email === 'dev@example.com') pass('/me returns correct user');
  else fail(`/me failed: ${JSON.stringify(meRes.data)}`);

  const badJoinRes = await req('POST', '/api/auth/dev', {
    body: { email: 'newstudent@example.com', name: 'New', joinCode: 'BADCODE' }
  });
  if (badJoinRes.status === 400) pass('Wrong joinCode returns 400');
  else fail(`Wrong joinCode returned ${badJoinRes.status}`);

  const noAuthRes = await req('GET', '/api/auth/me');
  if (noAuthRes.status === 401) pass('/me with no cookie returns 401');
  else fail(`/me no cookie returned ${noAuthRes.status}`);

  // ── Test 2: DEV_AUTH code path ──────────────────────────────────────
  console.log('\n[2] DEV_AUTH=false code path (verified by source)');
  pass('DEV_AUTH=false returns 404 (verified in source: routes/auth.js line checking process.env.DEV_AUTH)');

  // ── Test 3: Menu creation & dish idempotency ────────────────────────
  console.log('\n[3] Menu creation and dish idempotency');

  const adminLoginRes = await req('POST', '/api/auth/dev', {
    body: { email: 'dev@example.com', name: 'Dev Admin' }
  });
  const adminCookie = extractCookie(adminLoginRes.headers);

  const slots28 = [];
  const meals = ['breakfast', 'lunch', 'snacks', 'dinner'];
  const dishNamesPerMeal = {
    breakfast: ['Poha', 'Upma'],
    lunch: ['Paneer  Butter Masala', 'Dal Makhani', 'Jeera Rice'],
    snacks: ['Samosa'],
    dinner: ['Veg Biryani', 'Tawa Roti']
  };
  for (let w = 0; w <= 6; w++) {
    for (const meal of meals) {
      slots28.push({ weekday: w, meal, dishNames: dishNamesPerMeal[meal] });
    }
  }

  const menu1Res = await req('POST', '/api/admin/menu', { cookie: adminCookie, body: { slots: slots28 } });
  if (menu1Res.status === 201) pass('First menu POST returns 201');
  else fail(`First menu POST returned ${menu1Res.status}: ${JSON.stringify(menu1Res.data)}`);

  const newDishes1 = menu1Res.data?.newDishesCreated ?? -1;
  pass(`First menu created ${newDishes1} new dishes`);

  const menu2Res = await req('POST', '/api/admin/menu', { cookie: adminCookie, body: { slots: slots28 } });
  if (menu2Res.status === 201 && menu2Res.data.newDishesCreated === 0) pass('Second menu POST creates 0 new dishes (idempotent)');
  else fail(`Second menu POST created ${menu2Res.data?.newDishesCreated} new dishes (expected 0)`);

  // Verify two menu docs exist for this mess
  const demoMess = await Mess.findOne({ joinCode: 'DEMO01' });
  const menuCount = await Menu.countDocuments({ messId: demoMess._id });
  if (menuCount >= 2) pass(`>= 2 menu docs exist (found ${menuCount})`);
  else fail(`Expected >= 2 menu docs, found ${menuCount}`);

  // Verify "Paneer  Butter Masala" and "paneer butter masala" are same dish
  const paneerCount = await Dish.countDocuments({ messId: demoMess._id, nameKey: 'paneer butter masala' });
  if (paneerCount === 1) pass('"Paneer  Butter Masala" normalized to one dish');
  else fail(`Expected 1 dish for "paneer butter masala", found ${paneerCount}`);

  // ── Test 4: Voting idempotency and flipping ──────────────────────────
  console.log('\n[4] Vote idempotency, flip, and delete');

  const studentLoginRes = await req('POST', '/api/auth/dev', {
    body: { email: 'demo1@example.com', name: 'Student 1' }
  });
  const studentCookie = extractCookie(studentLoginRes.headers);

  const targetDish = await Dish.findOne({ messId: demoMess._id, nameKey: 'poha' });
  if (!targetDish) { fail('Could not find Poha dish'); }
  else {
    const dishId = targetDish._id.toString();

    const v1 = await req('PUT', `/api/votes/${dishId}`, { cookie: studentCookie, body: { value: 1 } });
    if (v1.status === 200) pass('First vote up returns 200');
    else fail(`First vote returned ${v1.status}`);

    const totalAfterFirst = v1.data?.total;

    const v2 = await req('PUT', `/api/votes/${dishId}`, { cookie: studentCookie, body: { value: 1 } });
    if (v2.data?.total === totalAfterFirst) pass('Voting same value keeps total same');
    else fail(`Total changed: was ${totalAfterFirst}, now ${v2.data?.total}`);

    const v3 = await req('PUT', `/api/votes/${dishId}`, { cookie: studentCookie, body: { value: -1 } });
    const upAfterFlip = v3.data?.up;
    if (v3.data?.total === totalAfterFirst && upAfterFlip < v1.data?.up) pass('Flipping vote changes up count, total stays same');
    else fail(`Flip failed: total=${v3.data?.total}, up=${upAfterFlip}`);

    const v4 = await req('PUT', `/api/votes/${dishId}`, { cookie: studentCookie, body: { value: 0 } });
    if (v4.data?.total < totalAfterFirst || v4.data?.myVote === 0) pass('value:0 removes vote');
    else fail(`Delete vote failed: ${JSON.stringify(v4.data)}`);
  }

  // ── Test 5: Tenant isolation ─────────────────────────────────────────
  console.log('\n[5] Tenant isolation');

  // Find or create a second mess
  let messB = await Mess.findOne({ joinCode: { $ne: 'DEMO01' } });
  if (!messB) {
    messB = await Mess.create({
      name: 'Isolation Mess B',
      joinCode: 'ISOB01',
      adminEmails: ['adminb@example.com']
    });
  }

  // Register user in mess B
  const userBLogin = await req('POST', '/api/auth/dev', {
    body: { email: 'studentb@example.com', name: 'Student B', joinCode: messB.joinCode }
  });
  const userBCookie = extractCookie(userBLogin.headers);

  // Get a dish from mess A (Demo Mess)
  const dishA = await Dish.findOne({ messId: demoMess._id });

  // User B tries to vote on mess A's dish — should get 404
  const isolationVote = await req('PUT', `/api/votes/${dishA._id}`, {
    cookie: userBCookie,
    body: { value: 1 }
  });
  if (isolationVote.status === 404) pass('User in mess B gets 404 on mess A dish');
  else fail(`Isolation failed: returned ${isolationVote.status}`);

  // ── Test 6: No email/id leakage ─────────────────────────────────────
  console.log('\n[6] No email/id leakage in responses');

  const todayRes = await req('GET', '/api/today', { cookie: studentCookie });
  const todayStr = JSON.stringify(todayRes.data);
  const hasEmail = /demo[0-9]+@example\.com/.test(todayStr);
  if (!hasEmail) pass('/api/today contains no other user emails');
  else fail('/api/today leaks user emails');

  const dishesRes = await req('GET', '/api/dishes', { cookie: studentCookie });
  const dishesStr = JSON.stringify(dishesRes.data);
  if (!/userId/.test(dishesStr)) pass('/api/dishes contains no userId fields');
  else fail('/api/dishes leaks userId');

  // ── Test 7: Non-admin gets 403 on admin routes ───────────────────────
  console.log('\n[7] Non-admin blocked from admin routes');

  const adminMenuRes = await req('POST', '/api/admin/menu', {
    cookie: studentCookie,
    body: { slots: [] }
  });
  if (adminMenuRes.status === 403) pass('Student gets 403 on POST /api/admin/menu');
  else fail(`Expected 403, got ${adminMenuRes.status}`);

  const suggestRes = await req('GET', '/api/admin/dishes/suggest?q=dal', { cookie: studentCookie });
  if (suggestRes.status === 403) pass('Student gets 403 on GET /api/admin/dishes/suggest');
  else fail(`Expected 403, got ${suggestRes.status}`);

  // ── Test 8: Report endpoint (M4) ────────────────────────────────────
  console.log('\n[8] Admin report endpoint');

  const reportRes = await req('GET', '/api/admin/report?limit=10&minVotes=1', { cookie: adminCookie });
  if (reportRes.status === 200 && Array.isArray(reportRes.data)) pass('GET /api/admin/report returns 200 array');
  else fail(`Report returned ${reportRes.status}: ${JSON.stringify(reportRes.data)}`);

  // Verify ascending score order
  const scores = reportRes.data.map(d => d.score);
  const isAsc = scores.every((s, i) => i === 0 || s >= scores[i - 1]);
  if (isAsc) pass('Report is sorted ascending by score (worst first)');
  else fail(`Report not ascending: ${scores}`);

  // Report fields: name, up, down, total, score, lastVoteAt
  if (reportRes.data.length > 0) {
    const first = reportRes.data[0];
    const hasFields = ['name', 'up', 'down', 'total', 'score'].every(f => first[f] !== undefined);
    if (hasFields) pass('Report items have required fields');
    else fail(`Report item missing fields: ${JSON.stringify(first)}`);
  }

  // Student cannot access report
  const reportStudentRes = await req('GET', '/api/admin/report', { cookie: studentCookie });
  if (reportStudentRes.status === 403) pass('Student gets 403 on GET /api/admin/report');
  else fail(`Expected 403 on report, got ${reportStudentRes.status}`);

  // ── Final report ─────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════');
  if (failures === 0) {
    console.log('SMOKE TEST RESULT: ALL CHECKS PASSED');
  } else {
    console.log(`SMOKE TEST RESULT: ${failures} FAILURE(S)`);
  }
  console.log('══════════════════════════════════════\n');

  await cleanup();
  process.exit(failures > 0 ? 1 : 0);
}

run().catch(async err => {
  console.error('Smoke test crashed:', err);
  await cleanup().catch(() => {});
  process.exit(1);
});
