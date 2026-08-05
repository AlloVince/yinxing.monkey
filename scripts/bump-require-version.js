/**
 * Bump the `?v=` query parameter in the Tampermonkey @require URL.
 *
 * Connects to the Tampermonkey Service Worker via Chrome DevTools Protocol,
 * reads the script source from chrome.storage.local, increments the version
 * number in the @require line, and writes it back.
 *
 * Usage:  node scripts/bump-require-version.js [script-name]
 *         Default script name: "银杏"
 *         (Requires Chrome with --remote-debugging-port=9222 running)
 */

const fs = require('fs');
const path = require('path');

/** Load .env file manually (avoid extra dependency). */
function loadEnv() {
  const env = {};
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (key) env[key] = value;
    }
  }
  return env;
}

const env = loadEnv();
const CDP = env.CDP_URL || 'http://127.0.0.1:9222';
const DEV_SERVER_URL = env.DEV_SERVER_URL || 'http://localhost:8080';
// Extract host (without scheme) for matching the @require line
const devServerHost = DEV_SERVER_URL.replace(/^https?:\/\//, '');
// Script name to find in TM storage
const scriptName = env.TM_SCRIPT_NAME || process.argv[2] || '银杏';

async function main() {
  // 1. Find the TM Service Worker target
  const targets = await fetch(`${CDP}/json`).then(r => r.json());
  const tmTarget = targets.find(t =>
    t.url?.includes('dhdgffkkebhmkfjojejmpbldmpobfkfo') &&
    t.type === 'service_worker'
  );
  if (!tmTarget) {
    console.error('❌ Tampermonkey Service Worker not found. Is Chrome running with --remote-debugging-port=9222?');
    process.exit(1);
  }

  // 2. Connect via WebSocket
  const wsUrl = tmTarget.webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  let msgId = 0;
  const pending = new Map();

  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m.result);
      pending.delete(m.id);
    }
  };

  const send = (method, params = {}) => new Promise(resolve => {
    const id = ++msgId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });

  await new Promise(resolve => ws.onopen = resolve);
  await send('Runtime.enable');

  // 3. Find the script source by @name, then bump the @require version
  const readResult = await send('Runtime.evaluate', {
    expression: `
      (async () => {
        const all = await chrome.storage.local.get(null);
        // Find the source key whose value contains @name <scriptName>
        const sourceKey = Object.keys(all).find(k => {
          if (!k.includes('@source')) return false;
          const v = all[k].value || '';
          return v.includes('@name') && v.includes('${scriptName}');
        });
        if (!sourceKey) return { error: 'Script "${scriptName}" not found in TM storage' };
        const entry = all[sourceKey];
        const source = entry.value;
        const lines = source.split('\\n');
        const reqIdx = lines.findIndex(l => l.includes('@require') && l.includes('${devServerHost}'));
        if (reqIdx === -1) return { error: '@require line with dev server not found' };
        const currentLine = lines[reqIdx];
        const match = currentLine.match(/v=(\\d+)/);
        const currentVer = match ? parseInt(match[1], 10) : 0;
        const newVer = currentVer + 1;
        const newLine = currentLine.replace(/v=\\d+/, 'v=' + newVer);
        lines[reqIdx] = newLine;
        entry.value = lines.join('\\n');
        await chrome.storage.local.set({ [sourceKey]: entry });
        return { oldVer: currentVer, newVer, oldLine: currentLine.trim(), newLine: newLine.trim() };
      })()
    `,
    returnByValue: true,
    awaitPromise: true,
  });

  const result = readResult?.result?.value;
  if (!result) {
    console.error('❌ Failed to read/update TM storage:', JSON.stringify(readResult));
    ws.close();
    process.exit(1);
  }

  if (result.error) {
    console.error('❌', result.error);
    ws.close();
    process.exit(1);
  }

  console.log(`✅ @require version bumped: v=${result.oldVer} → v=${result.newVer}`);
  console.log(`   ${result.oldLine}`);
  console.log(`   ${result.newLine}`);

  // 4. Restart the TM Service Worker so it picks up the new config
  console.log('🔄 Restarting Tampermonkey Service Worker...');
  // chrome.runtime.reload() kills the SW immediately, so fire-and-forget
  await send('Runtime.evaluate', {
    expression: `chrome.runtime.reload()`,
    returnByValue: true,
  }).catch(() => {}); // Connection will drop — that's expected
  console.log('✅ Tampermonkey restarted. Refresh the 115 page to load the new bundle.');

  ws.close();
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
