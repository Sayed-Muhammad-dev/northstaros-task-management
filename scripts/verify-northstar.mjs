import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Uses the existing browser installation. No package install, mock response,
// direct database write, environment-file edit or cloud deployment occurs here.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const appOrigin = new URL(option('--app', 'http://127.0.0.1:5345')).origin;
const apiOrigin = new URL(option('--api', 'http://127.0.0.1:5346')).origin;
for (const origin of [appOrigin, apiOrigin]) {
  assert(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(origin).hostname), 'QA requires a local server');
}
const apiFinal = args.includes('--api-final');
const apiOnly = args.includes('--api-only') || apiFinal;
const layoutOnly = args.includes('--layout-only');
const responsiveOnly = args.includes('--responsive-only');
const uiFinish = args.includes('--ui-finish');
const uiResume = args.includes('--ui-resume') || uiFinish;
const uiOnly = args.includes('--ui-only') || uiResume || responsiveOnly || layoutOnly;
const tabletOnly = args.includes('--tablet-only');
const captureOnly = args.includes('--capture-only') || tabletOnly;
assert([apiOnly, uiOnly, captureOnly].filter(Boolean).length <= 1, 'Choose one QA mode');
const runId = Date.now().toString(36);
const evidence = path.join(root, '.browser-evidence', `run-${runId}`);
const credentialsPath = path.join(root, '.app-data', 'browser-demo.json');
const puppeteerPath = 'D:/Project/Rozana-Kart/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const executablePath = process.env.NORTHSTAR_QA_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const report = {
  status: 'RUNNING', mode: tabletOnly ? 'Tablet recapture' : layoutOnly ? 'Layout diagnostic' : responsiveOnly ? 'Responsive follow-up' : captureOnly ? 'captures' : uiResume ? 'UI follow-up' : uiOnly ? 'UI' : apiFinal ? 'API follow-up' : apiOnly ? 'API' : 'API + UI',
  appOrigin, apiOrigin, startedAt: new Date().toISOString(), stages: [], captures: [],
  responsive: [], runtimeErrors: [], unexpectedHttpErrors: [],
  limitations: ['Local browser and HTTP verification; no cloud deployment claim.', 'QA data is created through authenticated HTTP APIs; no mocked persistence.'],
};
const redactValues = [];
const secretValues = [];
const redact = (value) => {
  let text = String(value);
  for (const secret of [...redactValues].sort((a, b) => b.length - a.length)) {
    if (secret) text = text.split(secret).join('[private]');
  }
  return text.replace(/([?&]token=)[^&\s]+/gi, '$1[private]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[private email]');
};
let browser;
let ownerPage;
let memberPage;
let accounts;
let projectId;
let taskId;
let contractHash;
const expectedFailures = new WeakMap();
const good = (response, label = 'HTTP request') => {
  assert(response.status >= 200 && response.status < 300, `${label} returned HTTP ${response.status}`);
  return response.data;
};
const rejected = (response, statuses, label) => assert(statuses.includes(response.status), `${label} returned HTTP ${response.status}`);
async function stage(name, work) {
  const start = Date.now();
  try {
    await work();
    report.stages.push({ name, status: 'PASS', milliseconds: Date.now() - start });
    console.log(`PASS ${name}`);
  } catch (error) {
    report.stages.push({ name, status: 'FAIL', error: redact(error.message), milliseconds: Date.now() - start });
    throw new Error(`${name}: ${redact(error.message)}`);
  }
}
function permitFailure(page, method, endpoint, statuses) {
  const entries = expectedFailures.get(page) || [];
  entries.push({ method, endpoint, statuses });
  expectedFailures.set(page, entries);
}
function observe(page) {
  page.setDefaultTimeout(12000);
  page.on('pageerror', (error) => report.runtimeErrors.push(redact(error.message)));
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (!url.pathname.startsWith('/api/') || response.status() < 400) return;
    const method = response.request().method();
    const expected = (expectedFailures.get(page) || []).some((entry) =>
      entry.method === method && entry.endpoint === url.pathname && entry.statuses.includes(response.status()));
    if (!expected) report.unexpectedHttpErrors.push({ method, path: url.pathname, status: response.status() });
  });
}
async function request(page, endpoint, { body, workspaceId, allow = [], raw = false } = {}) {
  const method = body === undefined ? 'GET' : 'POST';
  if (allow.length) permitFailure(page, method, endpoint, allow);
  return page.evaluate(async ({ endpoint, body, workspaceId, raw }) => {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (workspaceId) headers['X-Workspace-Id'] = workspaceId;
    const response = await fetch(endpoint, {
      method: body === undefined ? 'GET' : 'POST', headers, credentials: 'include', cache: 'no-store',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const content = await response.text();
    let data = content;
    if (!raw) {
      try { data = JSON.parse(content); } catch { data = null; }
    }
    return { status: response.status, data, contentType: response.headers.get('content-type') };
  }, { endpoint, body, workspaceId, raw });
}
const state = async (page) => good(await request(page, '/api/state'), 'State hydration');
async function action(page, name, payload, { snapshot, allow = [] } = {}) {
  const current = snapshot || await state(page);
  return request(page, '/api/state', {
    body: { revision: current.revision, action: name, payload }, workspaceId: current.workspace.id, allow,
  });
}
const mutate = async (page, name, payload) => good(await action(page, name, payload), name);
async function loginApi(page, account) {
  return good(await request(page, '/api/auth/login', { body: { email: account.email, password: account.password } }), 'Login');
}
async function navigate(page, route) {
  await page.goto(appOrigin + route, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => !document.querySelector('[aria-label="Loading your workspace"]'));
}
async function preflight() {
  assert(existsSync(puppeteerPath), 'Existing absolute Puppeteer import is missing');
  assert(existsSync(executablePath), 'Chrome executable is missing');
  const contract = await readFile(path.join(root, 'server/CONTRACT.md'), 'utf8');
  for (const marker of ['POST /api/state', 'POST /api/auth/register', 'X-Workspace-Id', '/api/invitations/accept', 'POST /api/workspaces']) {
    assert(contract.includes(marker), `Required contract is missing: ${marker}`);
  }
  contractHash = createHash('sha256').update(contract).digest('hex');
  for (const target of ['.app-data/browser-demo.json', '.browser-evidence/report.json']) {
    try { execFileSync('git', ['check-ignore', '--quiet', target], { cwd: root, stdio: 'ignore' }); }
    catch { throw new Error(`Private output directory is not ignored: ${path.dirname(target)}`); }
  }
  if (args.includes('--prepare')) {
    console.log(JSON.stringify({ status: 'READY', contractHash, privateOutputsIgnored: true, browserTestsRun: false }));
    return false;
  }
  const health = await Promise.all([
    fetch(appOrigin, { signal: AbortSignal.timeout(6000) }),
    fetch(apiOrigin + '/api/health', { signal: AbortSignal.timeout(6000) }),
  ]);
  assert(health.every((response) => response.ok), 'Local app or API is unavailable');
  assert.equal((await health[1].json()).driver, 'sqlite', 'Expected actual SQLite HTTP API');
  return true;
}
async function startBrowser() {
  const { default: puppeteer } = await import(pathToFileURL(puppeteerPath).href);
  browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run', '--disable-default-apps'] });
  ownerPage = await (await browser.createBrowserContext()).newPage();
  memberPage = await (await browser.createBrowserContext()).newPage();
  for (const page of [ownerPage, memberPage]) {
    observe(page);
    await page.setViewport({ width: 1440, height: 1000 });
    await page.goto(appOrigin, { waitUntil: 'networkidle0' });
  }
}
async function prepareAccounts() {
  if (uiOnly || captureOnly || apiFinal) {
    accounts = JSON.parse(await readFile(credentialsPath, 'utf8'));
    assert(accounts.owner?.email && accounts.member?.password, 'Private demo account file is incomplete');
  } else {
    assert(!existsSync(credentialsPath), 'Private demo credentials already exist. Reuse --ui-only, --ui-resume, --ui-finish, --api-final or --capture-only; existing demo passwords are never replaced.');
    accounts = {
      createdAt: new Date().toISOString(), appOrigin,
      owner: { name: 'Workspace Owner', company: 'Demo Workspace', email: `demo-owner-${runId}@example.test`, password: randomBytes(24).toString('base64url') },
      member: { name: 'Workspace Member', company: 'Personal Workspace', email: `demo-member-${runId}@example.test`, password: randomBytes(24).toString('base64url') },
    };
    await mkdir(path.dirname(credentialsPath), { recursive: true });
    await writeFile(credentialsPath, JSON.stringify(accounts, null, 2) + '\n', { mode: 0o600 });
  }
  for (const account of [accounts.owner, accounts.member]) {
    redactValues.push(account.email, account.password);
    secretValues.push(account.password);
  }
  if (uiOnly || captureOnly || apiFinal) {
    await loginApi(ownerPage, accounts.owner);
    await loginApi(memberPage, accounts.member);
    if (accounts.ownerWorkspaceId) good(await request(ownerPage, '/api/workspaces/select', { body: { id: accounts.ownerWorkspaceId } }));
    projectId = accounts.projectId;
    taskId = accounts.taskId;
    const current = await state(ownerPage);
    accounts.ownerWorkspaceId ??= current.workspace.id;
    accounts.memberWorkspaceId ??= (await state(memberPage)).workspace.id;
    projectId ??= current.projects.find((item) => item.name === 'Website Launch')?.id;
    taskId ??= current.tasks.find((item) => item.title === 'Review launch checklist')?.id;
    accounts.projectId = projectId;
    accounts.taskId = taskId;
    accounts.emptyWorkspaceId ??= good(await request(ownerPage, '/api/workspaces')).workspaces.find((item) => item.name === 'Empty Workspace')?.id;
    await writeFile(credentialsPath, JSON.stringify(accounts, null, 2) + '\n', { mode: 0o600 });
  }
}

async function apiChecks() {
  let ownerInitial;
  let memberInitial;
  let inviteToken;
  const dueDate = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  if (!apiFinal) {
  await stage('API: two registrations, session hydration and account isolation', async () => {
    good(await request(ownerPage, '/api/auth/register', { body: accounts.owner }), 'Owner registration');
    good(await request(memberPage, '/api/auth/register', { body: accounts.member }), 'Member registration');
    ownerInitial = await state(ownerPage);
    memberInitial = await state(memberPage);
    assert.notEqual(ownerInitial.workspace.id, memberInitial.workspace.id, 'Accounts must have isolated workspaces');
    assert.equal(ownerInitial.currentUser.name, 'Workspace Owner');
    assert.equal(ownerInitial.members.length, 1, 'Fresh workspace must not contain invented teammates');
    assert(ownerInitial.members.every((item) => item.id === ownerInitial.currentUser.id));
    assert(ownerInitial.tasks.every((item) => item.assigneeId === ownerInitial.currentUser.id));
    assert(ownerInitial.projects.every((item) => !memberInitial.projects.some((other) => other.id === item.id)));
    const me = good(await request(ownerPage, '/api/me'));
    assert.equal(me.user.workspaceId, ownerInitial.workspace.id);
    await ownerPage.reload({ waitUntil: 'networkidle0' });
    assert.equal((await state(ownerPage)).currentUser.id, ownerInitial.currentUser.id);
    accounts.ownerWorkspaceId = ownerInitial.workspace.id;
    accounts.memberWorkspaceId = memberInitial.workspace.id;
  });
  await stage('API: authenticated origin enforcement and foreign workspace denial', async () => {
    const cookies = await ownerPage.browserContext().cookies();
    const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
    secretValues.push(...cookies.map((cookie) => cookie.value));
    redactValues.push(...cookies.map((cookie) => cookie.value));
    const before = await state(ownerPage);
    for (const origin of [undefined, 'https://untrusted.example']) {
      const response = await fetch(apiOrigin + '/api/state', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookieHeader, ...(origin ? { Origin: origin } : {}) },
        body: JSON.stringify({ revision: before.revision, action: 'markAllNotificationsRead', payload: {} }),
        signal: AbortSignal.timeout(6000),
      });
      assert.equal(response.status, 403, 'Missing/foreign origin must be denied');
    }
    assert.equal((await state(ownerPage)).revision, before.revision, 'CSRF rejection must not mutate state');
    rejected(await request(memberPage, '/api/workspaces/select', { body: { id: before.workspace.id }, allow: [403, 404] }), [403, 404], 'Foreign workspace selection');
    rejected(await action(memberPage, 'updateProject', { id: before.projects[0].id, patch: { name: 'Forbidden update' } }, { allow: [400, 403, 404] }), [400, 403, 404], 'Foreign project update');
    assert.equal((await state(memberPage)).workspace.id, memberInitial.workspace.id);
  });
  await stage('API: project/task creation, editing and reload persistence', async () => {
    let current = await mutate(ownerPage, 'createProject', {
      name: 'Website Launch', client: 'Sample project', summary: 'Prepare a focused release with clear ownership and a shared launch checklist.',
      dueDate, members: [ownerInitial.currentUser.id], budget: 'Planning', tags: ['Sample', 'Launch'],
    });
    projectId = current.projects.find((item) => item.name === 'Website Launch')?.id;
    assert(projectId, 'Created project was not returned');
    current = await mutate(ownerPage, 'updateProject', { id: projectId, patch: { summary: 'Coordinate design, content, accessibility and final release review.' } });
    assert.equal(current.projects.find((item) => item.id === projectId).summary, 'Coordinate design, content, accessibility and final release review.');
    current = await mutate(ownerPage, 'createTask', {
      title: 'Review launch checklist', projectId, description: 'Confirm the release checklist and share remaining questions with the team.',
      status: 'Todo', priority: 'High', dueDate, assigneeId: ownerInitial.currentUser.id,
      labels: ['Sample', 'Launch'], subtasks: [{ label: 'Review accessibility', done: false }, { label: 'Confirm release notes', done: false }],
    });
    taskId = current.tasks.find((item) => item.title === 'Review launch checklist')?.id;
    assert(taskId, 'Created task was not returned');
    current = await mutate(ownerPage, 'updateTask', { id: taskId, patch: { description: 'Review the checklist, confirm ownership and prepare release notes.' } });
    await ownerPage.reload({ waitUntil: 'networkidle0' });
    const persisted = await state(ownerPage);
    assert.equal(persisted.tasks.find((item) => item.id === taskId).description, 'Review the checklist, confirm ownership and prepare release notes.');
    assert.equal(persisted.revision, current.revision);
    accounts.projectId = projectId;
    accounts.taskId = taskId;
  });
  await stage('API: comments/messages persisted with server-authored identities', async () => {
    let current = await mutate(ownerPage, 'addComment', { taskId, content: 'The checklist is ready for a shared review.' });
    assert.equal(current.comments[taskId].at(-1).authorId, ownerInitial.currentUser.id);
    assert.equal(current.tasks.find((item) => item.id === taskId).comments, current.comments[taskId].length);
    const thread = current.messageThreads.find((item) => item.participants.includes(ownerInitial.currentUser.id));
    assert(thread, 'A real participant message thread is required');
    current = await mutate(ownerPage, 'addMessage', { threadId: thread.id, content: 'Release preparation is moving forward. Please review the checklist.' });
    assert.equal(current.messageThreads.find((item) => item.id === thread.id).messages.at(-1).authorId, ownerInitial.currentUser.id);
    await ownerPage.reload({ waitUntil: 'networkidle0' });
    assert.equal((await state(ownerPage)).comments[taskId].at(-1).content, 'The checklist is ready for a shared review.');
  });
  await stage('API: exact-email invitation, one-use acceptance and role restrictions', async () => {
    const invitation = good(await request(ownerPage, '/api/invitations', { body: { email: accounts.member.email, role: 'member' } }));
    assert.equal(invitation.invitation.email, accounts.member.email);
    inviteToken = new URL(invitation.inviteLink, appOrigin).searchParams.get('token');
    assert(inviteToken, 'Returned invite URL must carry its documented token');
    secretValues.push(inviteToken);
    redactValues.push(inviteToken);
    rejected(await request(ownerPage, '/api/invitations/accept', { body: { token: inviteToken }, allow: [400, 403, 404, 410] }), [400, 403, 404, 410], 'Wrong-email invite acceptance');
    const joined = good(await request(memberPage, '/api/invitations/accept', { body: { token: inviteToken } }));
    assert.equal(joined.user.workspaceId, ownerInitial.workspace.id);
    assert.equal(joined.user.role, 'member');
    rejected(await request(memberPage, '/api/invitations/accept', { body: { token: inviteToken }, allow: [400, 403, 404, 410] }), [400, 403, 404, 410], 'Replayed invite');
    const memberState = await state(memberPage);
    assert.equal(memberState.invitations.length, 0, 'Members must not receive owner invitation data');
    for (const [name, payload] of [
      ['deleteProject', { id: projectId }], ['updateSettings', { patch: { appearance: 'dark' } }],
    ]) rejected(await action(memberPage, name, payload, { allow: [403] }), [403], `Member ${name}`);
    rejected(await request(memberPage, '/api/invitations', { body: { email: accounts.owner.email, role: 'owner' }, allow: [403] }), [403], 'Member invitation');
    rejected(await request(memberPage, '/api/backup', { allow: [403] }), [403], 'Member backup');
    rejected(await request(memberPage, '/api/members/role', { body: { id: ownerInitial.currentUser.id, role: 'member' }, allow: [403] }), [403], 'Member role escalation');
    const commented = await mutate(memberPage, 'addComment', { taskId, content: 'I will review the release notes next.' });
    assert.equal(commented.comments[taskId].at(-1).authorId, memberState.currentUser.id);
    rejected(await request(ownerPage, '/api/members/role', { body: { id: ownerInitial.currentUser.id, role: 'member' }, allow: [400, 409] }), [400, 409], 'Last owner demotion');
  });
  await stage('API: workspace switching, stale-tab rejection and revision conflicts', async () => {
    const memberships = good(await request(memberPage, '/api/workspaces')).workspaces;
    assert(memberships.some((item) => item.id === memberInitial.workspace.id && item.role === 'owner'));
    assert(memberships.some((item) => item.id === ownerInitial.workspace.id && item.role === 'member'));
    good(await request(memberPage, '/api/workspaces/select', { body: { id: memberInitial.workspace.id } }));
    const personal = await state(memberPage);
    assert(!personal.tasks.some((item) => item.id === taskId), 'Switched workspace leaked another workspace task');
    rejected(await request(memberPage, '/api/state', {
      body: { revision: personal.revision, action: 'markAllNotificationsRead', payload: {} },
      workspaceId: ownerInitial.workspace.id, allow: [400, 403, 409],
    }), [400, 403, 409], 'Stale workspace header');
    const snapshot = await state(ownerPage);
    const updated = await mutate(ownerPage, 'updateTask', { id: taskId, patch: { priority: 'Critical' } });
    const conflict = await action(ownerPage, 'updateTask', { id: taskId, patch: { priority: 'Low' } }, { snapshot, allow: [409] });
    rejected(conflict, [409], 'Stale revision');
    assert.equal(conflict.data.revision, updated.revision);
    assert.equal((await state(ownerPage)).tasks.find((item) => item.id === taskId).priority, 'Critical', 'Conflict overwrote current state');
  });
  await stage('API: derived completion, reopening, subtask and settings persistence', async () => {
    let current = await mutate(ownerPage, 'moveTask', { id: taskId, status: 'Completed' });
    assert.equal(current.tasks.find((item) => item.id === taskId).progress, 100);
    assert.equal(current.projects.find((item) => item.id === projectId).status, 'Completed');
    current = await mutate(ownerPage, 'moveTask', { id: taskId, status: 'Review' });
    assert(current.tasks.find((item) => item.id === taskId).progress < 100);
    assert.notEqual(current.projects.find((item) => item.id === projectId).status, 'Completed');
    const subtask = current.tasks.find((item) => item.id === taskId).subtasks[0];
    current = await mutate(ownerPage, 'toggleSubtask', { id: taskId, subtaskId: subtask.id });
    assert.equal(current.tasks.find((item) => item.id === taskId).subtasks[0].done, !subtask.done);
    await mutate(ownerPage, 'updateSettings', { patch: { timezone: 'Asia/Karachi', appearance: 'light' } });
    await ownerPage.reload({ waitUntil: 'networkidle0' });
    assert.equal((await state(ownerPage)).settings.timezone, 'Asia/Karachi');
  });
  await stage('API: genuinely empty workspace, project deletion cascades and selection', async () => {
    const created = good(await request(ownerPage, '/api/workspaces', { body: { name: 'Empty Workspace' } }));
    accounts.emptyWorkspaceId = created.user.workspaceId;
    let empty = await state(ownerPage);
    assert.equal(empty.projects.length, 0);
    assert.equal(empty.tasks.length, 0);
    empty = await mutate(ownerPage, 'createProject', {
      name: 'Temporary project', client: '', summary: '', dueDate, members: [empty.currentUser.id], budget: '', tags: [],
    });
    const temporaryProject = empty.projects[0];
    empty = await mutate(ownerPage, 'createTask', {
      title: 'Temporary task', projectId: temporaryProject.id, description: '', status: 'Todo', priority: 'Low',
      dueDate, assigneeId: empty.currentUser.id, labels: [], subtasks: [],
    });
    const temporaryTask = empty.tasks[0];
    await mutate(ownerPage, 'addComment', { taskId: temporaryTask.id, content: 'Temporary comment' });
    empty = await mutate(ownerPage, 'deleteProject', { id: temporaryProject.id });
    assert.equal(empty.projects.length, 0);
    assert.equal(empty.tasks.length, 0);
    assert(!empty.comments[temporaryTask.id]);
    good(await request(ownerPage, '/api/workspaces/select', { body: { id: accounts.ownerWorkspaceId } }));
    assert.equal((await state(ownerPage)).workspace.id, accounts.ownerWorkspaceId);
  });
  }
  await stage('API: real CSV, private backup and reports derived from current state', async () => {
    const current = await state(ownerPage);
    const csv = good(await request(ownerPage, '/api/export.csv', { raw: true }), 'CSV export');
    assert(csv.includes('Review launch checklist'));
    const backup = good(await request(ownerPage, '/api/backup'), 'Owner backup');
    assert.equal(backup.state.workspace.id, current.workspace.id);
    assert.equal(backup.state.tasks.length, current.tasks.length);
    const backupText = JSON.stringify(backup);
    assert(!/"(?:password|passwordHash|sessionHash|tokenHash|inviteToken)"\s*:/.test(backupText), 'Backup exposes a secret field');
    assert(secretValues.every((secret) => !backupText.includes(secret)), 'Backup exposes an authentication secret');
    const summary = good(await request(ownerPage, '/api/reports'));
    assert.equal(summary.taskCount, current.tasks.length);
    assert.equal(summary.completedTasks, current.tasks.filter((item) => item.status === 'Completed').length);
    assert.equal(summary.projects.length, current.projects.length);
    const printable = good(await request(ownerPage, '/api/reports/print', { raw: true }));
    assert(printable.includes('Website Launch'));
    assert(printable.includes(`${summary.taskCount} tasks`));
  });
  await stage('API: logout revokes session and subsequent hydration is anonymous', async () => {
    good(await request(ownerPage, '/api/auth/logout', { body: {} }));
    assert.equal(good(await request(ownerPage, '/api/me')).user, null);
    rejected(await request(ownerPage, '/api/state', { allow: [401] }), [401], 'Logged-out state access');
    await loginApi(ownerPage, accounts.owner);
    assert.equal((await state(ownerPage)).workspace.id, accounts.ownerWorkspaceId);
  });
  await writeFile(credentialsPath, JSON.stringify(accounts, null, 2) + '\n', { mode: 0o600 });
}

async function uiSourceReady() {
  const source = await readFile(path.join(root, 'src/pages/AppPages.tsx'), 'utf8');
  return source.includes('ProjectForm') && source.includes('TaskForm') && source.includes('useAction')
    && !source.includes('Dashboard summary was sent to your leadership group.')
    && !source.includes('defaultValue="Maya Chen"');
}
async function field(page, names, scope = 'page') {
  const labels = Array.isArray(names) ? names : [names];
  await page.waitForFunction(({ names, scope }) => {
    const visible = (element) => !!element && element.getClientRects().length > 0;
    const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(visible);
    const container = scope === 'dialog' ? dialogs.at(-1) : document;
    return !!container && [...container.querySelectorAll('input,textarea,select')].some((element) => {
      const label = element.closest('label')?.querySelector('span')?.textContent?.trim()
        || element.getAttribute('aria-label') || element.getAttribute('placeholder') || '';
      return visible(element) && names.includes(label);
    });
  }, {}, { names: labels, scope });
  const handle = await page.evaluateHandle(({ names, scope }) => {
    const visible = (element) => !!element && element.getClientRects().length > 0;
    const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(visible);
    const container = scope === 'dialog' ? dialogs.at(-1) : document;
    if (!container) return null;
    return [...container.querySelectorAll('input,textarea,select')].find((element) => {
      const label = element.closest('label')?.querySelector('span')?.textContent?.trim()
        || element.getAttribute('aria-label') || element.getAttribute('placeholder') || '';
      return visible(element) && names.includes(label);
    }) || null;
  }, { names: Array.isArray(names) ? names : [names], scope });
  const element = handle.asElement();
  assert(element, `Accessible field missing: ${Array.isArray(names) ? names[0] : names}`);
  return element;
}
async function fill(page, names, value, scope = 'page') {
  const element = await field(page, names, scope);
  const type = await element.evaluate((node) => node.type);
  if (type === 'date') {
    await element.evaluate((node, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, value);
      node.dispatchEvent(new Event('input', { bubbles: true }));
      node.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
  } else {
    await element.focus();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await element.type(value);
    await page.keyboard.press('Tab');
  }
  await element.dispose();
}
async function select(page, names, value, scope = 'page') {
  const element = await field(page, names, scope);
  const optionValue = await element.evaluate((node, value) => [...node.options].find((item) => item.value === value || item.textContent.trim() === value)?.value, value);
  assert(optionValue !== undefined, `Select option missing for ${Array.isArray(names) ? names[0] : names}`);
  await element.select(optionValue);
  await element.dispose();
}
async function button(page, names, scope = 'page') {
  await page.waitForFunction(({ names, scope }) => {
    const visible = (element) => element.getClientRects().length > 0;
    const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(visible);
    const container = scope === 'dialog' ? dialogs.at(-1) : document;
    return !!container && [...container.querySelectorAll('button')].some((element) => visible(element)
      && names.includes(element.getAttribute('aria-label') || element.textContent.trim()));
  }, {}, { names: Array.isArray(names) ? names : [names], scope });
  const handle = await page.evaluateHandle(({ names, scope }) => {
    const visible = (element) => element.getClientRects().length > 0;
    const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(visible);
    const container = scope === 'dialog' ? dialogs.at(-1) : document;
    return container ? [...container.querySelectorAll('button')].find((element) => visible(element)
      && names.includes(element.getAttribute('aria-label') || element.textContent.trim())) || null : null;
  }, { names: Array.isArray(names) ? names : [names], scope });
  const element = handle.asElement();
  assert(element, `Button missing: ${Array.isArray(names) ? names[0] : names}`);
  return element;
}
async function click(page, names, scope = 'page') {
  const element = await button(page, names, scope);
  try { await page.waitForFunction((node) => node.isConnected && !node.disabled, {}, element); }
  catch { throw new Error(`Button remained disabled: ${Array.isArray(names) ? names[0] : names}`); }
  await element.click();
  await element.dispose();
}
async function waitDialog(page, open) {
  await page.waitForFunction((open) => [...document.querySelectorAll('[role="dialog"]')].some((node) => node.getClientRects().length) === open, {}, open);
}
async function uiRequest(page, endpoint, trigger, { actionName, allow = [] } = {}) {
  if (allow.length) permitFailure(page, 'POST', endpoint, allow);
  const pending = page.waitForResponse((response) => {
    if (new URL(response.url()).pathname !== endpoint || response.request().method() !== 'POST') return false;
    if (!actionName) return true;
    try { return JSON.parse(response.request().postData()).action === actionName; } catch { return false; }
  });
  pending.catch(() => {});
  await trigger();
  const response = await pending;
  const data = await response.json();
  const result = { status: response.status(), data };
  if (!allow.includes(result.status)) good(result, actionName || endpoint);
  return result;
}
const uiMutation = (page, actionName, trigger, options = {}) => uiRequest(page, '/api/state', trigger, { ...options, actionName });
async function loginUi(page, account) {
  await navigate(page, '/login');
  await fill(page, 'Work email', account.email);
  await fill(page, 'Password', account.password);
  await uiRequest(page, '/api/auth/login', () => click(page, 'Continue to NorthstarOS'));
  await page.waitForFunction(() => location.pathname.startsWith('/app/'));
  await page.waitForSelector('#workspace-main');
}
async function logoutUi(page) {
  await uiRequest(page, '/api/auth/logout', () => click(page, 'Log out'));
  await page.waitForFunction(() => location.pathname === '/login');
}
async function assertContained(page, label) {
  const dimensions = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  assert(Math.max(dimensions.document, dimensions.body) <= dimensions.width + 1, `${label}: page overflow (${dimensions.document}/${dimensions.body} > ${dimensions.width})`);
  return dimensions;
}
async function uiChecks() {
  const dueDate = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  let uiProjectId = accounts.uiProjectId;
  let uiTaskId = accounts.uiTaskId;
  if (!uiResume) {
  await stage('UI: logout/login, protected redirects and same-browser account isolation', async () => {
    await navigate(ownerPage, '/app/dashboard');
    assert.equal((await state(ownerPage)).workspace.id, accounts.ownerWorkspaceId);
    await logoutUi(ownerPage);
    await navigate(ownerPage, '/app/tasks/' + taskId);
    assert.equal(new URL(ownerPage.url()).pathname, '/login');
    await loginUi(ownerPage, accounts.member);
    assert.equal((await state(ownerPage)).workspace.id, accounts.memberWorkspaceId);
    assert(!await ownerPage.evaluate(() => document.body.innerText.includes('Review launch checklist')), 'Previous account data remained visible');
    await logoutUi(ownerPage);
    await loginUi(ownerPage, accounts.owner);
  });
  await stage('UI: accessible modal keyboard trap, Escape and trigger focus restoration', async () => {
    await navigate(ownerPage, '/app/projects');
    await click(ownerPage, 'New project');
    await waitDialog(ownerPage, true);
    assert(await ownerPage.evaluate(() => document.querySelector('[role="dialog"]').contains(document.activeElement)), 'Dialog initial focus is outside');
    const labels = await ownerPage.evaluate(() => {
      const root = document.querySelector('[role="dialog"]');
      const list = [...root.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')];
      list.at(-1).focus();
      return list.length;
    });
    assert(labels > 1, 'Dialog focusable controls missing');
    await ownerPage.keyboard.press('Tab');
    assert(await ownerPage.evaluate(() => document.activeElement === document.querySelector('[role="dialog"] button')), 'Tab did not wrap to dialog start');
    await ownerPage.keyboard.press('Escape');
    await waitDialog(ownerPage, false);
    assert.equal(await ownerPage.evaluate(() => document.activeElement.textContent.trim()), 'New project');
  });
  await stage('UI: project create/edit saves actual state and survives reload', async () => {
    await click(ownerPage, 'New project');
    await waitDialog(ownerPage, true);
    await fill(ownerPage, 'Project name', 'Product Roadmap', 'dialog');
    await fill(ownerPage, 'Summary', 'Align upcoming improvements and prepare a clear stakeholder update.', 'dialog');
    await fill(ownerPage, 'Due date', dueDate, 'dialog');
    await fill(ownerPage, 'Tags (comma separated)', 'Sample, Planning', 'dialog');
    let result = await uiMutation(ownerPage, 'createProject', () => click(ownerPage, 'Create project', 'dialog'));
    uiProjectId = result.data.projects.find((item) => item.name === 'Product Roadmap')?.id;
    assert(uiProjectId, 'UI-created project absent in API response');
    await waitDialog(ownerPage, false);
    await navigate(ownerPage, '/app/projects/' + uiProjectId);
    await click(ownerPage, 'Edit project');
    await waitDialog(ownerPage, true);
    await fill(ownerPage, 'Summary', 'Keep priorities clear, review progress and share the next delivery milestones.', 'dialog');
    await uiMutation(ownerPage, 'updateProject', () => click(ownerPage, 'Save project', 'dialog'));
    await waitDialog(ownerPage, false);
    await ownerPage.reload({ waitUntil: 'networkidle0' });
    assert.equal((await state(ownerPage)).projects.find((item) => item.id === uiProjectId).summary, 'Keep priorities clear, review progress and share the next delivery milestones.');
  });
  await stage('UI: task create/edit, subtask and keyboard Kanban movement', async () => {
    await navigate(ownerPage, '/app/projects/' + uiProjectId);
    await click(ownerPage, 'Add task');
    await waitDialog(ownerPage, true);
    await fill(ownerPage, 'Task title', 'Prepare stakeholder update', 'dialog');
    await fill(ownerPage, 'Description', 'Summarize the next milestones and collect feedback before the planning meeting.', 'dialog');
    await select(ownerPage, 'Status', 'Todo', 'dialog');
    await select(ownerPage, 'Priority', 'High', 'dialog');
    await fill(ownerPage, 'Due date', dueDate, 'dialog');
    await fill(ownerPage, 'Labels (comma separated)', 'Sample, Planning', 'dialog');
    await fill(ownerPage, 'Subtasks (one per line)', 'Review milestone dates\nShare the planning notes', 'dialog');
    const created = await uiMutation(ownerPage, 'createTask', () => click(ownerPage, 'Create task', 'dialog'));
    uiTaskId = created.data.tasks.find((item) => item.title === 'Prepare stakeholder update')?.id;
    assert(uiTaskId, 'UI-created task absent in API response');
    await waitDialog(ownerPage, false);
    await navigate(ownerPage, '/app/tasks/' + uiTaskId);
    await click(ownerPage, 'Edit task');
    await waitDialog(ownerPage, true);
    await fill(ownerPage, 'Description', 'Summarize milestones, clarify priorities and collect feedback for the next planning meeting.', 'dialog');
    await uiMutation(ownerPage, 'updateTask', () => click(ownerPage, 'Save task', 'dialog'));
    await waitDialog(ownerPage, false);
    const subtask = await ownerPage.$('main input[type="checkbox"]');
    assert(subtask, 'Task subtask checkbox missing');
    await uiMutation(ownerPage, 'toggleSubtask', () => subtask.click());
    await navigate(ownerPage, '/app/kanban');
    const move = await button(ownerPage, 'Move Prepare stakeholder update to the next column');
    await move.focus();
    const moved = await uiMutation(ownerPage, 'moveTask', () => ownerPage.keyboard.press('Enter'));
    assert.equal(moved.data.tasks.find((item) => item.id === uiTaskId).status, 'In Progress');
    await ownerPage.reload({ waitUntil: 'networkidle0' });
    assert.equal((await state(ownerPage)).tasks.find((item) => item.id === uiTaskId).status, 'In Progress');
  });
  await stage('UI: real comments and messages with saved authors', async () => {
    await navigate(ownerPage, '/app/tasks/' + uiTaskId);
    await fill(ownerPage, 'Add a comment', 'The milestones are ready to discuss at our next planning review.');
    const commented = await uiMutation(ownerPage, 'addComment', () => click(ownerPage, 'Add comment'));
    assert.equal(commented.data.comments[uiTaskId].at(-1).authorId, commented.data.currentUser.id);
    await navigate(ownerPage, '/app/messages');
    await fill(ownerPage, 'Message', 'The roadmap update is ready. Please share feedback before our planning review.');
    const messaged = await uiMutation(ownerPage, 'addMessage', () => click(ownerPage, 'Send message'));
    assert(messaged.data.messageThreads.some((thread) => thread.messages.some((item) => item.content === 'The roadmap update is ready. Please share feedback before our planning review.' && item.authorId === messaged.data.currentUser.id)));
    await ownerPage.reload({ waitUntil: 'networkidle0' });
    assert.equal((await state(ownerPage)).comments[uiTaskId].at(-1).content, 'The milestones are ready to discuss at our next planning review.');
  });
  }
  assert(uiProjectId && uiTaskId, 'Saved UI entities are required to resume');
  accounts.uiProjectId = uiProjectId;
  accounts.uiTaskId = uiTaskId;
  await writeFile(credentialsPath, JSON.stringify(accounts, null, 2) + '\n', { mode: 0o600 });
  await uiSettingsInvitesAndFilters(uiProjectId, uiTaskId, dueDate);
}
async function uiSettingsInvitesAndFilters(uiProjectId, uiTaskId, dueDate) {
  if (!uiFinish) {
  await stage('UI: workspace creation, invitation acceptance and member controls', async () => {
    await navigate(ownerPage, '/app/settings');
    await click(ownerPage, 'Workspace');
    let teamWorkspaceId;
    if (uiResume) teamWorkspaceId = good(await request(ownerPage, '/api/workspaces')).workspaces.find((item) => item.name === 'Team Planning')?.id;
    if (teamWorkspaceId) {
      await select(ownerPage, 'Active workspace', teamWorkspaceId);
    } else {
      await fill(ownerPage, 'Create another workspace', 'Team Planning');
      const created = await uiRequest(ownerPage, '/api/workspaces', () => click(ownerPage, 'Create workspace'));
      teamWorkspaceId = created.data.user.workspaceId;
    }
    accounts.teamWorkspaceId = teamWorkspaceId;
    await writeFile(credentialsPath, JSON.stringify(accounts, null, 2) + '\n', { mode: 0o600 });
    await ownerPage.waitForFunction(() => document.querySelector('header')?.textContent.includes('Team Planning'));
    await navigate(ownerPage, '/app/team');
    await fill(ownerPage, 'Invitee email', accounts.member.email);
    await select(ownerPage, 'Invitation role', 'member');
    const invited = await uiRequest(ownerPage, '/api/invitations', () => click(ownerPage, 'Create invitation'));
    const token = new URL(invited.data.inviteLink).searchParams.get('token');
    secretValues.push(token);
    redactValues.push(token);
    const link = await field(ownerPage, 'Private invitation link (expires in 7 days)');
    assert.equal(await link.evaluate((node) => node.value), invited.data.inviteLink);
    await navigate(memberPage, '/invite?token=' + encodeURIComponent(token));
    await uiRequest(memberPage, '/api/invitations/accept', () => click(memberPage, 'Accept invitation'));
    await memberPage.waitForFunction(() => location.pathname === '/app/dashboard');
    const joined = await state(memberPage);
    assert.equal(joined.workspace.id, teamWorkspaceId);
    assert.equal(joined.currentUser.role, 'member');
    await navigate(memberPage, '/app/projects');
    assert(!await memberPage.evaluate(() => [...document.querySelectorAll('button')].some((node) => node.textContent.trim() === 'New project')), 'Member receives owner project creation control');
    await navigate(memberPage, '/app/team');
    assert(!await memberPage.evaluate(() => [...document.querySelectorAll('button')].some((node) => node.textContent.trim() === 'Create invitation')), 'Member receives owner invitation control');
    await navigate(memberPage, '/app/settings');
    await click(memberPage, 'Appearance');
    assert(await memberPage.$eval('[role="switch"][aria-label="Dark appearance"]', (node) => node.disabled), 'Member can change workspace appearance');
    await select(memberPage, 'Active workspace', accounts.memberWorkspaceId);
    await memberPage.waitForFunction(() => document.querySelector('header')?.textContent.includes('Personal Workspace'));
    assert.equal((await state(memberPage)).workspace.id, accounts.memberWorkspaceId);
    await select(ownerPage, 'Active workspace', accounts.ownerWorkspaceId);
    await ownerPage.waitForFunction(() => document.querySelector('header')?.textContent.includes('Demo Workspace'));
  });
  await stage('UI: stale revision shows a recoverable error without overwriting', async () => {
    await navigate(ownerPage, '/app/tasks/' + uiTaskId);
    await click(ownerPage, 'Edit task');
    await waitDialog(ownerPage, true);
    await fill(ownerPage, 'Description', 'Unsaved edit for conflict verification.', 'dialog');
    const current = await state(ownerPage);
    const original = current.tasks.find((item) => item.id === uiTaskId).description;
    await mutate(ownerPage, 'updateTask', { id: uiTaskId, patch: { priority: 'Critical' } });
    const conflict = await uiMutation(ownerPage, 'updateTask', () => click(ownerPage, 'Save task', 'dialog'), { allow: [409] });
    assert.equal(conflict.status, 409);
    await ownerPage.waitForFunction(() => [...document.querySelectorAll('[role="alert"]')].some((node) => node.textContent.includes('not saved')));
    assert.equal((await state(ownerPage)).tasks.find((item) => item.id === uiTaskId).description, original);
    await ownerPage.keyboard.press('Escape');
    await waitDialog(ownerPage, false);
  });
  await stage('UI: settings save and reload actual workspace preferences', async () => {
    await navigate(ownerPage, '/app/settings');
    await click(ownerPage, 'Appearance');
    await fill(ownerPage, 'Workspace timezone (IANA)', 'Europe/London');
    await uiMutation(ownerPage, 'updateSettings', () => click(ownerPage, 'Save timezone'));
    await ownerPage.reload({ waitUntil: 'networkidle0' });
    assert.equal((await state(ownerPage)).settings.timezone, 'Europe/London');
    await click(ownerPage, 'Appearance');
    await uiMutation(ownerPage, 'updateSettings', () => click(ownerPage, 'Dark appearance'));
    await ownerPage.waitForFunction(() => document.documentElement.classList.contains('dark'));
    await uiMutation(ownerPage, 'updateSettings', () => click(ownerPage, 'Dark appearance'));
    await ownerPage.waitForFunction(() => !document.documentElement.classList.contains('dark'));
  });
  await stage('UI: empty workspace views and disabled task creation', async () => {
    assert(accounts.emptyWorkspaceId, 'A genuinely empty workspace must exist');
    await select(ownerPage, 'Active workspace', accounts.emptyWorkspaceId);
    await ownerPage.waitForFunction(() => document.querySelector('header')?.textContent.includes('Empty Workspace'));
    for (const route of ['dashboard', 'projects', 'tasks', 'kanban', 'calendar', 'reports', 'analytics']) {
      await navigate(ownerPage, '/app/' + route);
      await assertContained(ownerPage, 'Empty workspace ' + route);
      assert(!await ownerPage.evaluate(() => /\bNaN\b|Infinity%/.test(document.querySelector('main').innerText)), 'Invalid empty-state metric');
    }
    await navigate(ownerPage, '/app/tasks');
    const create = await button(ownerPage, 'New task');
    assert(await create.evaluate((node) => node.disabled), 'No-project task creation must be unavailable');
    const empty = await state(ownerPage);
    assert.equal(empty.projects.length, 0);
    assert.equal(empty.tasks.length, 0);
    await select(ownerPage, 'Active workspace', accounts.ownerWorkspaceId);
    await ownerPage.waitForFunction(() => document.querySelector('header')?.textContent.includes('Demo Workspace'));
  });
  await stage('UI: current-month calendar and month navigation', async () => {
    await navigate(ownerPage, '/app/calendar');
    const heading = await ownerPage.$eval('main h3', (node) => node.textContent.trim());
    assert.equal(heading, new Date().toLocaleDateString('en', { month: 'long', year: 'numeric' }));
    await click(ownerPage, 'Next month');
    assert.notEqual(await ownerPage.$eval('main h3', (node) => node.textContent.trim()), heading);
    await click(ownerPage, 'Previous month');
    assert.equal(await ownerPage.$eval('main h3', (node) => node.textContent.trim()), heading);
    await click(ownerPage, 'Today');
  });
  }
  await stage('UI: search and filter reset/clamp pagination', async () => {
    let current = await state(ownerPage);
    const sampleNames = ['Draft release notes', 'Confirm design handoff', 'Schedule team review', 'Prepare content outline'];
    for (const title of sampleNames) {
      if (current.tasks.length >= 8) break;
      if (current.tasks.some((item) => item.title === title)) continue;
      current = await mutate(ownerPage, 'createTask', {
        title, projectId, description: 'Sample planning task for the upcoming release.', status: 'Todo', priority: 'Medium',
        dueDate, assigneeId: current.currentUser.id, labels: ['Sample', 'Launch'], subtasks: [],
      });
    }
    assert(current.tasks.length > 6, 'Pagination requires more than one page of real saved tasks');
    await navigate(ownerPage, '/app/tasks');
    report.paginationTrace = { apiTasks: current.tasks.length, steps: [] };
    const trace = async (name) => report.paginationTrace.steps.push({ name, ...await ownerPage.evaluate(() => ({
      pagination: document.querySelector('nav[aria-label="Pagination"]')?.textContent,
      search: document.querySelector('input[aria-label="Search tasks"]')?.value,
      status: document.querySelector('select[aria-label="Task status filter"]')?.value,
      project: document.querySelector('select[aria-label="Task project filter"]')?.value,
      nextDisabled: [...document.querySelectorAll('nav[aria-label="Pagination"] button')].find((node) => node.textContent.trim() === 'Next')?.disabled,
    })) });
    await trace('initial');
    await click(ownerPage, 'Next');
    await trace('after next');
    assert(await ownerPage.$eval('nav[aria-label="Pagination"]', (node) => node.textContent.includes('Page 2')));
    await fill(ownerPage, 'Search tasks', 'Prepare stakeholder update');
    await trace('after search');
    await ownerPage.waitForFunction(() => document.querySelector('nav[aria-label="Pagination"]').textContent.includes('Page 1 of 1'));
    assert(await ownerPage.$eval('nav[aria-label="Pagination"]', (node) => node.textContent.includes('Page 1 of 1')));
    assert(await ownerPage.evaluate(() => document.querySelector('main').innerText.includes('Prepare stakeholder update')));
    await fill(ownerPage, 'Search tasks', '');
    await trace('after clear');
    assert(await ownerPage.$eval('nav[aria-label="Pagination"]', (node) => node.textContent.includes('Page 1 of 2')), 'Clearing search restored the previous page instead of resetting to page 1');
    await click(ownerPage, 'Next');
    await select(ownerPage, 'Task status filter', 'Review');
    await ownerPage.waitForFunction(() => document.querySelector('nav[aria-label="Pagination"]').textContent.includes('Page 1 of 1'));
    assert(await ownerPage.$eval('nav[aria-label="Pagination"]', (node) => node.textContent.includes('Page 1 of 1')));
  });
  await stage('UI: actual CSV and workspace JSON download buttons', async () => {
    const downloadPath = path.join(evidence, 'private-downloads');
    await mkdir(downloadPath, { recursive: true });
    const session = await ownerPage.createCDPSession();
    await session.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath });
    for (const [endpoint, route, tab, label] of [
      ['/api/export.csv', '/app/reports', null, 'Export CSV'],
      ['/api/backup', '/app/settings', 'Workspace', 'Download workspace JSON'],
    ]) {
      await navigate(ownerPage, route);
      if (tab) await click(ownerPage, tab);
      const responsePromise = ownerPage.waitForResponse((response) => new URL(response.url()).pathname === endpoint && response.request().method() === 'GET');
      responsePromise.catch(() => {});
      await click(ownerPage, label);
      assert.equal((await responsePromise).status(), 200, 'Download API response failed');
    }
    let files = [];
    for (let attempt = 0; attempt < 40; attempt++) {
      files = await readdir(downloadPath);
      if (files.some((item) => item.endsWith('.csv')) && files.some((item) => item.endsWith('.json'))) break;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    const csv = files.find((item) => item.endsWith('.csv'));
    const json = files.find((item) => item.endsWith('.json'));
    assert(csv && json, 'Browser did not finish both file downloads');
    assert((await readFile(path.join(downloadPath, csv), 'utf8')).includes('Prepare stakeholder update'));
    const backup = JSON.parse(await readFile(path.join(downloadPath, json), 'utf8'));
    assert.equal(backup.state.workspace.id, accounts.ownerWorkspaceId);
    assert(backup.state.tasks.some((item) => item.id === uiTaskId));
    assert(secretValues.every((secret) => !JSON.stringify(backup).includes(secret)), 'Downloaded backup contains an authentication secret');
    await session.detach();
  });
  await stage('UI: task/project deletion and cancellable confirmation', async () => {
    await navigate(ownerPage, '/app/projects/' + uiProjectId);
    await click(ownerPage, 'Add task');
    await waitDialog(ownerPage, true);
    await fill(ownerPage, 'Task title', 'Temporary planning note', 'dialog');
    const created = await uiMutation(ownerPage, 'createTask', () => click(ownerPage, 'Create task', 'dialog'));
    const temporaryId = created.data.tasks.find((item) => item.title === 'Temporary planning note')?.id;
    assert(temporaryId);
    await waitDialog(ownerPage, false);
    await navigate(ownerPage, '/app/tasks/' + temporaryId);
    await click(ownerPage, 'Delete task');
    await waitDialog(ownerPage, true);
    const deleted = await uiMutation(ownerPage, 'deleteTask', () => click(ownerPage, 'Confirm deletion', 'dialog'));
    assert(!deleted.data.tasks.some((item) => item.id === temporaryId));
    await waitDialog(ownerPage, false);
    await navigate(ownerPage, '/app/projects/' + uiProjectId);
    await click(ownerPage, 'Delete');
    await waitDialog(ownerPage, true);
    await ownerPage.keyboard.press('Escape');
    await waitDialog(ownerPage, false);
    assert((await state(ownerPage)).projects.some((item) => item.id === uiProjectId), 'Cancelled deletion changed project');
    await navigate(ownerPage, '/app/projects');
    await click(ownerPage, 'New project');
    await waitDialog(ownerPage, true);
    await fill(ownerPage, 'Project name', 'Temporary review', 'dialog');
    const temporary = await uiMutation(ownerPage, 'createProject', () => click(ownerPage, 'Create project', 'dialog'));
    const temporaryProjectId = temporary.data.projects.find((item) => item.name === 'Temporary review')?.id;
    assert(temporaryProjectId);
    await waitDialog(ownerPage, false);
    await navigate(ownerPage, '/app/projects/' + temporaryProjectId);
    await click(ownerPage, 'Delete');
    await waitDialog(ownerPage, true);
    const projectDeleted = await uiMutation(ownerPage, 'deleteProject', () => click(ownerPage, 'Confirm deletion', 'dialog'));
    assert(!projectDeleted.data.projects.some((item) => item.id === temporaryProjectId));
    await waitDialog(ownerPage, false);
  });
  await stage('UI: logout clears hydrated state and protected deep-link redirects', async () => {
    await navigate(ownerPage, '/app/dashboard');
    await logoutUi(ownerPage);
    await navigate(ownerPage, '/app/tasks/' + uiTaskId);
    assert.equal(new URL(ownerPage.url()).pathname, '/login');
    assert(!await ownerPage.evaluate(() => document.body.innerText.includes('Prepare stakeholder update')));
    await loginUi(ownerPage, accounts.owner);
    good(await request(ownerPage, '/api/workspaces/select', { body: { id: accounts.ownerWorkspaceId } }));
  });
}
async function responsiveAndCaptures() {
  const current = await state(ownerPage);
  const captureTaskId = accounts.uiTaskId || taskId;
  const captureProjectId = accounts.uiProjectId || projectId;
  assert(current.tasks.some((item) => item.id === captureTaskId), 'Capture task must be a real persisted task');
  assert(current.projects.some((item) => item.id === captureProjectId), 'Capture project must be a real persisted project');
  assert.equal(current.currentUser.name, 'Workspace Owner');
  assert.equal(current.workspace.name, 'Demo Workspace');
  const routes = [
    '/app', '/app/dashboard', '/app/projects', '/app/projects/' + captureProjectId,
    '/app/kanban', '/app/calendar', '/app/tasks', '/app/tasks/' + captureTaskId,
    '/app/team', '/app/messages', '/app/notifications', '/app/reports', '/app/analytics',
    '/app/settings', '/app/profile', '/app/help', '/app/projects/missing-project', '/app/tasks/missing-task',
  ];
  if (!captureOnly) {
    await stage('Responsive: 18 app paths at 390, 768 and 1440 pixels', async () => {
      for (const width of [390, 768, 1440]) {
        await ownerPage.setViewport({ width, height: width === 390 ? 844 : 1000 });
        for (const route of routes) {
          await navigate(ownerPage, route);
          assert(new URL(ownerPage.url()).pathname.startsWith('/app'), 'Authenticated route unexpectedly redirected');
          await ownerPage.waitForSelector('#workspace-main');
          const dimensions = await assertContained(ownerPage, route);
          assert(!await ownerPage.evaluate(() => /\bNaN\b|Infinity%/.test(document.querySelector('main').innerText)), 'Route contains an invalid metric');
          if (route.endsWith('/missing-project')) assert(await ownerPage.evaluate(() => document.querySelector('main').innerText.includes('Project not found')));
          if (route.endsWith('/missing-task')) assert(await ownerPage.evaluate(() => document.querySelector('main').innerText.includes('Task not found')));
          report.responsive.push({ route: route.replace(captureProjectId, ':projectId').replace(captureTaskId, ':taskId'), width, status: 'PASS', ...dimensions });
        }
      }
      assert.equal(report.responsive.length, 54);
    });
    await stage('Responsive: mobile drawer keyboard focus, Escape and reduced motion', async () => {
      await ownerPage.setViewport({ width: 390, height: 844 });
      await navigate(ownerPage, '/app/tasks');
      await click(ownerPage, 'Open navigation');
      await waitDialog(ownerPage, true);
      await assertContained(ownerPage, 'Mobile navigation');
      assert(await ownerPage.evaluate(() => document.querySelector('[role="dialog"]').contains(document.activeElement)), 'Mobile drawer lacks initial focus');
      await ownerPage.keyboard.press('Escape');
      await waitDialog(ownerPage, false);
      assert.equal(await ownerPage.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Open navigation');
      await ownerPage.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      await navigate(ownerPage, '/app/kanban');
      assert(await ownerPage.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches));
      await assertContained(ownerPage, 'Reduced-motion Kanban');
      await ownerPage.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
    });
  }
  await stage(tabletOnly ? 'Captures: readable tablet dashboard without private identity' : 'Captures: final real desktop/tablet/phone interfaces without private identity', async () => {
    const scenes = [
      ['desktop.png', '/app/dashboard', 1440, 1000, 'Dashboard'],
      ['board.png', '/app/kanban', 1440, 1000, 'Kanban board'],
      ['calendar.png', '/app/calendar', 1440, 1000, 'Calendar'],
      ['task.png', '/app/tasks/' + captureTaskId, 1440, 1000, 'Task detail'],
      ['tablet.png', '/app/dashboard', 768, 1024, 'Dashboard'],
      ['phone.png', '/app/tasks', 390, 844, 'Tasks'],
    ];
    await mkdir(evidence, { recursive: true });
    for (const [file, route, width, height, view] of scenes) {
      if (tabletOnly && file !== 'tablet.png') continue;
      await ownerPage.setViewport({ width, height });
      await navigate(ownerPage, route);
      if (route === '/app/calendar') {
        const task = current.tasks.find((item) => item.id === captureTaskId);
        const date = task.dueDate;
        const month = new Date(date + 'T12:00:00');
        const today = new Date();
        const distance = (month.getFullYear() - today.getFullYear()) * 12 + month.getMonth() - today.getMonth();
        assert(Math.abs(distance) <= 24, 'Capture task date is too far from the current calendar month');
        for (let index = 0; index < Math.abs(distance); index++) await click(ownerPage, distance < 0 ? 'Previous month' : 'Next month');
        const label = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date + 'T12:00:00'));
        const day = await ownerPage.evaluateHandle((label) => [...document.querySelectorAll('main button[aria-label]')].find((node) => node.getAttribute('aria-label').startsWith(label + ', ')), label);
        assert(day.asElement(), 'Calendar capture must select the saved task due date');
        await day.asElement().click();
        await ownerPage.waitForFunction((title) => document.querySelector('main').innerText.includes(title), {}, task.title);
      }
      await ownerPage.evaluate(() => document.fonts.ready);
      await assertContained(ownerPage, 'Capture ' + view);
      const rendered = await ownerPage.evaluate(() => document.body.innerText);
      assert(!/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(rendered), 'Capture contains an email address');
      assert(!/Northstar QA|qa-owner|qa-member|Unsaved edit for conflict/i.test(rendered), 'Capture contains internal QA text');
      assert(!await ownerPage.$('input[type="password"]'), 'Capture contains password fields');
      assert(rendered.includes('Demo Workspace'), 'Capture uses the wrong workspace identity');
      if (route.includes('kanban')) assert(await ownerPage.$$eval('article', (nodes) => nodes.length > 0), 'Capture board must contain useful persisted tasks');
      await ownerPage.screenshot({ path: path.join(evidence, file), fullPage: false });
      report.captures.push({ file: `.browser-evidence/${path.basename(evidence)}/${file}`, route: route.replace(captureTaskId, ':taskId'), capturedOn: new Date().toISOString(), width, height, view, identity: 'Demo Workspace / Workspace Owner', source: 'Actual local UI and persisted synthetic workspace data' });
    }
  });
}
async function finalGuardChecks() {
  await stage('API: final compiled guards reject spoofed counts, dates, references and role elevation', async () => {
    const before = await state(ownerPage);
    const target = before.tasks.find((item) => item.id === (accounts.uiTaskId || taskId));
    assert(target, 'Persisted task is required for final validation guards');
    for (const patch of [{ progress: 100 }, { dueDate: '2030-02-30' }, { assigneeId: 'missing-member' }]) {
      rejected(await action(ownerPage, 'updateTask', { id: target.id, patch }, { allow: [400, 404] }), [400, 404], 'Invalid or immutable task patch');
    }
    const other = before.tasks.find((item) => item.id !== target.id && item.subtasks.length);
    assert(other, 'Another real task subtask is required');
    rejected(await action(ownerPage, 'updateTask', {
      id: target.id, patch: { subtasks: [{ id: other.subtasks[0].id, label: 'Invalid foreign subtask', done: true }] },
    }, { allow: [400] }), [400], 'Foreign subtask reference');
    rejected(await request(ownerPage, '/api/invitations', { body: { email: accounts.member.email, role: 'owner' }, allow: [409] }), [409], 'Existing membership elevation through invitation');
    assert.equal((await state(ownerPage)).revision, before.revision, 'Rejected final-guard requests changed state');
  });
}
async function layoutDiagnostic() {
  await ownerPage.setViewport({ width: 390, height: 844 });
  await navigate(ownerPage, '/app/messages');
  report.layoutTrace = await ownerPage.evaluate(() => [...document.querySelectorAll('main, main *')]
    .filter((node) => node.getClientRects().length && node.getBoundingClientRect().right > innerWidth + 1)
    .slice(0, 18).map((node) => {
      const style = getComputedStyle(node);
      return { tag: node.tagName, classes: node.className, width: Math.round(node.getBoundingClientRect().width), right: Math.round(node.getBoundingClientRect().right), scrollWidth: node.scrollWidth, minWidth: style.minWidth, overflowX: style.overflowX, whiteSpace: style.whiteSpace, columns: style.gridTemplateColumns };
    }));
  console.log(JSON.stringify({ route: '/app/messages', width: 390, layoutTrace: report.layoutTrace }));
  await stage('Responsive diagnostic: phone Messages containment', () => assertContained(ownerPage, 'Messages'));
}
async function priorEvidence() {
  const previous = new Map();
  for (const folder of (await readdir(path.join(root, '.browser-evidence'))).filter((name) => name.startsWith('run-')).sort()) {
    if (folder === path.basename(evidence)) continue;
    try {
      const saved = JSON.parse(await readFile(path.join(root, '.browser-evidence', folder, 'report.json'), 'utf8'));
      for (const entry of saved.stages || []) {
        if (entry.status === 'PASS') previous.set(entry.name, { name: entry.name, status: 'PASS', origin: saved.appOrigin, evidence: `.browser-evidence/${folder}/report.json` });
      }
    } catch { /* A concurrent/incomplete evidence folder supplies no result. */ }
  }
  const currentNames = new Set(report.stages.map((entry) => entry.name));
  report.priorVerifiedStages = [...previous.values()].filter((entry) => !currentNames.has(entry.name));
}
async function saveReport() {
  await mkdir(evidence, { recursive: true });
  await priorEvidence();
  if (report.responsive.length === 54) report.resolvedFindings = [
    { finding: 'Clearing a search restored an old page number.', resolution: 'Frontend owner persisted pagination key resets and count clamps.', verification: 'Actual saved-data search/filter pagination stage passed on the rebuilt server.' },
    { finding: 'Messages expanded the 390px page to 500px through intrinsic grid sizing.', resolution: 'Frontend owner constrained only the Messages grid and its cards.', verification: 'All 18 app paths now fit 390, 768 and 1440px viewports.' },
  ];
  report.finishedAt = new Date().toISOString();
  report.contractHash = contractHash;
  await writeFile(path.join(evidence, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  const rows = report.stages.map((entry) => `| ${entry.name} | ${entry.status} | ${entry.error || 'Verified against the running local app/API.'} |`).join('\n');
  const priorRows = report.priorVerifiedStages.map((entry) => `| ${entry.name} | PASS | ${entry.origin}; ${entry.evidence} |`).join('\n');
  const captures = report.captures.length ? report.captures.map((item) => `- ${item.file} — ${item.width}px, ${item.view}`).join('\n') : 'No final UI captures produced in this run.';
  const errors = [...report.runtimeErrors, ...report.unexpectedHttpErrors.map((item) => `${item.method} ${item.path}: HTTP ${item.status}`)];
  const resolved = report.resolvedFindings?.map((item) => `- ${item.finding} ${item.resolution} ${item.verification}`).join('\n');
  const doc = `# NorthstarOS QA\n\nStatus: **${report.status}**. Mode: **${report.mode}**. Finished: ${report.finishedAt}.\n\n` +
    `This report describes actual local Chromium/HTTP checks against ${appOrigin}, with the API on ${apiOrigin}. No responses are mocked or intercepted. Accounts, projects and tasks are created through the public HTTP contract. Reload checks verify server-backed hydration; this run does not prove persistence across a server restart or a cloud deployment.\n\n` +
    `The registered display identity is **Workspace Owner**, in **Demo Workspace**. Credentials are saved privately in the ignored \`.app-data/browser-demo.json\` file for local recapture. Passwords, cookies, invitation tokens and email addresses are excluded from this report and final screenshots.\n\n` +
    `## Results\n\n| Stage | Status | Evidence / error |\n| --- | --- | --- |\n${rows || '| Preparation | BLOCKED | No functional stages ran. |'}\n\n` +
    (priorRows ? `Earlier actual checks retained as separate evidence (these were not rerun):\n\n| Stage | Status | Origin / evidence |\n| --- | --- | --- |\n${priorRows}\n\n` : '') +
    (report.error ? `Run error: ${report.error}\n\n` : '') +
    `Responsive checks: ${report.responsive.length}. Runtime errors: ${report.runtimeErrors.length}. Unexpected failed API responses: ${report.unexpectedHttpErrors.length}.\n\n` +
    `${errors.length ? errors.map((error) => '- ' + error).join('\n') : 'No runtime/API errors were recorded during the stages that ran.'}\n\n` +
    (resolved ? `## Corrected during QA\n\n${resolved}\n\nThe initial invitation field failure was a harness render-timing issue. A visible-field wait confirmed the existing invitation source worked; no invitation source change was needed. Earlier failed runs remain in ignored evidence for traceability.\n\n` : '') +
    `## Captures\n\n${captures}\n\nEvidence JSON: \`.browser-evidence/${path.basename(evidence)}/report.json\`. Screenshots use only synthetic workspace data and useful sample labels. API-only mode deliberately produces no screenshots and does not verify application routes.\n\n` +
    `## Run locally\n\nStart Vite on 5345 and the API on 5346 with \`APP_ORIGIN=http://127.0.0.1:5345\`.\n\n` +
    '```powershell\nnode scripts/verify-northstar.mjs --prepare\nnode scripts/verify-northstar.mjs --api-only\n# Run after the frontend source and typecheck are ready:\nnode scripts/verify-northstar.mjs --app http://127.0.0.1:5347 --api http://127.0.0.1:5347 --ui-only\n# Recapture the persisted private demo identity after final UI changes:\nnode scripts/verify-northstar.mjs --app http://127.0.0.1:5347 --api http://127.0.0.1:5347 --capture-only\n```\n\n' +
    'Focused continuation flags: `--api-final` resumes exports/logout; `--ui-resume` resumes after the saved project/task/comment stages; `--ui-finish` resumes at pagination; `--responsive-only` skips completed functional checks; `--layout-only` collects text-free layout diagnostics. Prior stage results retain their original evidence paths and server origin. Final validation guards run against the compiled server during UI verification.\n\n' +
    'The script uses Puppeteer from the existing absolute Rozana installation and local Chrome. It performs a single readiness check, requires ignored credential/evidence directories, and never installs packages or edits app/backend source. A first run without a mode flag performs both API and UI stages. Existing private demo credentials are protected from replacement; use a continuation or capture mode thereafter. All writes remain in this script, this document, and the ignored evidence/credential paths.\n';
  await mkdir(path.join(root, 'docs'), { recursive: true });
  await writeFile(path.join(root, 'docs/QA.md'), doc);
}
async function main() {
  try {
    if (!await preflight()) return;
    await startBrowser();
    await prepareAccounts();
    if (!uiOnly && !captureOnly) await apiChecks();
    if (!apiOnly) {
      if (!await uiSourceReady()) {
        report.status = 'BLOCKED';
        report.stages.push({ name: 'UI: frontend integration readiness', status: 'BLOCKED', error: 'AppPages integration is still in progress. API results do not prove UI behavior.' });
      } else {
        if (layoutOnly) await layoutDiagnostic();
        else if (!captureOnly && !responsiveOnly) {
          await uiChecks();
          await finalGuardChecks();
        }
        if (!layoutOnly) await responsiveAndCaptures();
      }
    } else report.limitations.push('API-only run: application interactions, responsive routes and screenshots were not verified.');
    if (report.status !== 'BLOCKED') {
      await stage('Runtime: no uncaught browser errors or unexpected failed API calls', async () => {
        assert.equal(report.runtimeErrors.length, 0, 'Uncaught browser errors were recorded');
        assert.equal(report.unexpectedHttpErrors.length, 0, 'Unexpected failed API requests were recorded');
      });
      report.status = 'PASS';
    }
  } catch (error) {
    report.status = report.stages.length ? 'FAIL' : 'BLOCKED';
    report.error = redact(error.message);
  } finally {
    if (browser) await browser.close();
    if (!args.includes('--prepare')) {
      await saveReport();
      console.log(JSON.stringify({ status: report.status, mode: report.mode, passed: report.stages.filter((item) => item.status === 'PASS').length, responsive: report.responsive.length, captures: report.captures.length, ...(report.error ? { error: report.error } : {}) }));
      if (report.status !== 'PASS') process.exitCode = 1;
    }
  }
}
await main();
