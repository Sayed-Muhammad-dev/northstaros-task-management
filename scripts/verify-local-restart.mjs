import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const origin = 'http://127.0.0.1:5347';
const demo = JSON.parse(await readFile('.app-data/browser-demo.json', 'utf8'));
let cookie = '';
async function request(route, body) {
  const response = await fetch(origin + route, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  assert.ok(response.ok, `Local ${route}: HTTP ${response.status}`);
  const issued = response.headers.getSetCookie().find(value => value.startsWith('ns_session='));
  if (issued) cookie = issued.split(';')[0];
  return response.json();
}
try {
  const health = await request('/api/health');
  await request('/api/auth/login', { email: demo.owner.email, password: demo.owner.password });
  await request('/api/workspaces/select', { id: demo.ownerWorkspaceId });
  const state = await request('/api/state');
  assert.equal(state.currentUser.name, 'Workspace Owner');
  assert.equal(state.workspace.name, 'Demo Workspace');
  assert.ok(state.projects.some(project => project.id === demo.uiProjectId));
  assert.ok(state.tasks.some(task => task.id === demo.uiTaskId));
  const proof = { verifiedAt: new Date().toISOString(), origin, health, persistedProjectVerified: true, persistedTaskVerified: true, projectCount: state.projects.length, taskCount: state.tasks.length, secretsPrinted: false };
  await mkdir('.browser-evidence', { recursive: true });
  await writeFile('.browser-evidence/restart-verification.json', JSON.stringify(proof, null, 2));
  console.log('PASS: restarted compiled server authenticates the existing local account and retains its saved project/task records');
} finally {
  if (cookie) await request('/api/auth/logout', {}).catch(() => {});
}
