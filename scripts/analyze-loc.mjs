#!/usr/bin/env node
import { promises as fs } from 'fs'
import path from 'path'

const root = process.cwd()
const APPS_DIR = path.join(root, 'apps')

const isTextFile = (p) => /\.(tsx?|cts|mts)$/.test(p) && !p.endsWith('.d.ts')
const isExcludedFile = (p) => /\.(spec|test)\.(tsx?|cts|mts)$/.test(p) || p.includes('/__tests__/')
const isExcludedDir = (name) => ['node_modules', '.next', 'dist', 'build', 'coverage', '.turbo', '.vercel', 'public', 'out'].includes(name)

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    if (e.isDirectory()) {
      if (isExcludedDir(e.name)) continue
      yield* walk(path.join(dir, e.name))
    } else if (e.isFile()) {
      const full = path.join(dir, e.name)
      if (isTextFile(full) && !isExcludedFile(full)) yield full
    }
  }
}

function stripCommentsAndCount(content) {
  // crude but effective: remove block comments, then strip // comments per line
  const noBlocks = content.replace(/\/\*[\s\S]*?\*\//g, '')
  const lines = noBlocks.split(/\r?\n/)
  const rawTotal = lines.length
  let total = 0 // non-blank lines only
  let code = 0
  for (let line of lines) {
    if (line.trim().length > 0) total++
    // remove // comments (not inside strings – rough heuristic is OK for stats)
    const noLine = line.replace(/(^|\s)\/\/.*$/, '')
    if (noLine.trim().length > 0) code++
  }
  return { rawTotal, total, code }
}

function hasUseClient(content) {
  // only valid if at the very top (allow shebangs/blank lines/comments)
  const firstNonBlank = content.split(/\r?\n/).find(l => l.trim().length > 0)
  return firstNonBlank && /^['\"]use client['\"];?$/.test(firstNonBlank.trim())
}

async function analyze() {
  const exists = await fs.stat(APPS_DIR).then(()=>true,()=>false)
  if (!exists) {
    console.error('No apps/ directory found')
    process.exit(1)
  }

  const perGroup = new Map()
  const largest = [] // { file, total, code }

  for await (const file of walk(APPS_DIR)) {
    const rel = path.relative(root, file).replace(/\\/g,'/')
    const group = rel.split('/').slice(0,2).join('/') // e.g., apps/web-next
    const src = await fs.readFile(file, 'utf8')
    const { rawTotal, total, code } = stripCommentsAndCount(src)
    const useClient = hasUseClient(src) && rel.endsWith('.tsx')

    const g = perGroup.get(group) ?? { files: 0, rawTotal: 0, total: 0, code: 0, useClientFiles: 0, useClientCode: 0 }
    g.files++
    g.rawTotal += rawTotal
    g.total += total
    g.code += code
    if (useClient) { g.useClientFiles++; g.useClientCode += code }
    perGroup.set(group, g)

    largest.push({ file: rel, rawTotal, total, code })
  }

  largest.sort((a,b)=>b.code-a.code)

  let grand = { files: 0, rawTotal: 0, total: 0, code: 0, useClientFiles: 0, useClientCode: 0 }
  for (const [,g] of perGroup) {
    grand.files += g.files
    grand.rawTotal += g.rawTotal
    grand.total += g.total
    grand.code += g.code
    grand.useClientFiles += g.useClientFiles
    grand.useClientCode += g.useClientCode
  }

  const fmt = (n)=> new Intl.NumberFormat('en-US').format(n)

  console.log('LOC summary (apps/**)')
  console.log('---------------------------------------')
  console.log(`Files: ${fmt(grand.files)} | Raw total: ${fmt(grand.rawTotal)} | Total (non-blank): ${fmt(grand.total)} | Code lines: ${fmt(grand.code)}`)
  console.log(`Client components: ${fmt(grand.useClientFiles)} files | ${fmt(grand.useClientCode)} code lines`)
  console.log('\nBy app:')
  for (const [name,g] of Array.from(perGroup.entries()).sort()) {
    console.log(`- ${name}: files=${fmt(g.files)}, raw=${fmt(g.rawTotal)}, total=${fmt(g.total)}, code=${fmt(g.code)}, use-client=${fmt(g.useClientFiles)}/${fmt(g.useClientCode)}`)
  }
  console.log('\nLargest files by code (top 12):')
  largest.slice(0,12).forEach((x,i)=>{
    console.log(`${String(i+1).padStart(2,' ')}. ${x.file}  code=${fmt(x.code)} total=${fmt(x.total)} raw=${fmt(x.rawTotal)}`)
  })
}

analyze().catch((e)=>{ console.error(e); process.exit(1) })
