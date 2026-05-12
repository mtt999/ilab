import { readFileSync, mkdirSync, writeFileSync } from 'fs'

// Recreate docs/admin/index.html after every build.
// Vite wipes docs/ on each build, so GitHub Pages loses the /admin SPA route.
const src = readFileSync('docs/index.html', 'utf8')
const admin = src.replace('<title>iLab — Intelligent Laboratory</title>', '<title>iLab — Admin</title>')
mkdirSync('docs/admin', { recursive: true })
writeFileSync('docs/admin/index.html', admin)
console.log('✓ docs/admin/index.html recreated')
