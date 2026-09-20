import { loadEnv, type Plugin } from 'vite'
import { configureDb } from './db.ts'
import { handleApi } from './http.ts'
import { seedCases } from './seed.ts'
import type { ApiKeys } from './types.ts'

function keys(mode: string, envDir: string): ApiKeys {
  const env = loadEnv(mode, envDir, '')
  return {
    scrape:
      env.SCRAPE_CREATORS_API_KEY ||
      env.SCRAPECREATORS_API_KEY ||
      process.env.SCRAPE_CREATORS_API_KEY ||
      process.env.SCRAPECREATORS_API_KEY,
    typesafe:
      env.TYPESAFE_API_KEY ||
      env.JEV_API_KEY ||
      process.env.TYPESAFE_API_KEY ||
      process.env.JEV_API_KEY,
    supabaseUrl:
      env.SUPABASE_URL ||
      env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseService:
      env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  }
}

export function casesApi(): Plugin {
  return {
    name: 'jev-cases-api',
    configureServer(server) {
      const envDir = server.config.envDir || process.cwd()
      const loaded = keys(server.config.mode, envDir)
      configureDb(loaded)
      void seedCases().catch((error: unknown) => {
        console.error(
          '[jev] seed failed:',
          error instanceof Error ? error.message : error,
        )
      })
      server.middlewares.use((req, res, next) => {
        void handleApi(req, res, loaded).then((handled) => {
          if (!handled) next()
        })
      })
    },
    configurePreviewServer(server) {
      const loaded = keys('production', process.cwd())
      configureDb(loaded)
      server.middlewares.use((req, res, next) => {
        void handleApi(req, res, loaded).then((handled) => {
          if (!handled) next()
        })
      })
    },
  }
}
