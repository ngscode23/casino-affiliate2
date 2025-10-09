#!/usr/bin/env node
import { promises as fs } from 'fs'
import path from 'path'

async function ensureDataRoutes(nextDir) {
  const manifestPath = path.join(nextDir, 'routes-manifest.json')
  try {
    const raw = await fs.readFile(manifestPath, 'utf8')
    const json = JSON.parse(raw)
    if (!Array.isArray(json.dataRoutes)) {
      json.dataRoutes = []
      await fs.writeFile(manifestPath, JSON.stringify(json))
      console.log(`[patch-next-manifest] Added empty dataRoutes to ${manifestPath}`)
    } else {
      console.log('[patch-next-manifest] dataRoutes already present')
    }
  } catch (e) {
    console.error(`[patch-next-manifest] Failed to patch ${manifestPath}:`, e?.message || e)
    // Don't hard fail to avoid blocking start; start may still succeed
  }
}

const dirArg = process.argv[2] || path.join(process.cwd(), '.next')
await ensureDataRoutes(dirArg)

