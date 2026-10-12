import { build } from 'esbuild'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

await mkdir('.server', { recursive: true })
const result = await build({
  entryPoints: ['server/index.ts'], outfile: '.server/index.mjs',
  bundle: true, platform: 'node', target: 'node24', format: 'esm',
  packages: 'external', metafile: true,
  banner: { js: "process.env.NODE_ENV ??= 'production';" },
})
for (const input of Object.keys(result.metafile.inputs)) {
  if (/(^|\/)(\.env[^/]*|\.app-data|\.browser-evidence)(\/|$)/.test(input)) {
    throw new Error('Private runtime files must not enter the server build')
  }
}
const source = await readFile('.server/index.mjs', 'utf8')
if (/from\s+["'][^"']+\.ts["']/.test(source)) throw new Error('Uncompiled TypeScript import in server artifact')
await writeFile('.server/build-manifest.json', JSON.stringify({ inputs: Object.keys(result.metafile.inputs), builtOn: new Date().toISOString() }, null, 2))
console.log('Production API compiled; private runtime files excluded')
