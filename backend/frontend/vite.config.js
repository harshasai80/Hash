import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync, readFileSync } from 'node:fs'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const localEnv = existsSync('local.env')
    ? Object.fromEntries(readFileSync('local.env', 'utf8').split(/\r?\n/).filter(line => /^\s*VITE_[A-Z0-9_]+\s*=/.test(line)).map(line => {
      const [key, ...value] = line.split('=')
      return [key.trim(), value.join('=').trim().replace(/^['"]|['"]$/g, '')]
    }))
    : {}
  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL || localEnv.VITE_API_BASE_URL || 'https://hash-3f88.onrender.com'),
    },
  }
})
