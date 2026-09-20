import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { casesApi } from './server/plugin.ts'

export default defineConfig({
  plugins: [react(), casesApi()],
})
