// Generates the PWA / favicon assets from a single vector source (no fonts,
// so rasterization is deterministic). Run: node scripts/generate-icons.mjs
import sharp from 'sharp'
import { writeFile, mkdir } from 'node:fs/promises'

const BG = '#3d51ff' // p_primary (light)

// A chef's toque, centered well within the maskable safe zone, on the brand color.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${BG}"/>
  <g fill="#ffffff">
    <rect x="170" y="316" width="172" height="60" rx="16"/>
    <rect x="182" y="252" width="148" height="78"/>
    <circle cx="210" cy="252" r="56"/>
    <circle cx="302" cy="252" r="56"/>
    <circle cx="256" cy="214" r="66"/>
  </g>
  <g fill="${BG}" opacity="0.85">
    <circle cx="220" cy="348" r="7"/>
    <circle cx="256" cy="348" r="7"/>
    <circle cx="292" cy="348" r="7"/>
  </g>
</svg>`

const outDir = new URL('../public/', import.meta.url)
await mkdir(outDir, { recursive: true })

await writeFile(new URL('icon.svg', outDir), svg)
await writeFile(new URL('favicon.svg', outDir), svg)

const targets = [
  ['pwa-192.png', 192],
  ['pwa-512.png', 512],
  ['pwa-maskable-512.png', 512],
  ['apple-touch-icon-180.png', 180],
  ['favicon-32.png', 32],
]

for (const [name, size] of targets) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(new URL(name, outDir).pathname)
  console.log('wrote', name)
}
