import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import { wallpaperPackage } from './scripts/wallpaper-package.ts'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: './',
  // Vite library builds preserve process.env by default; the wallpaper has no Node runtime.
  define: {
    'process.env.NODE_ENV': JSON.stringify(command === 'build' ? 'production' : 'development'),
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    wallpaperPackage(version),
  ],
  build: {
    target: 'chrome100',
    lib: {
      entry: 'src/main.tsx',
      name: 'SlideshowStudio',
      formats: ['iife'],
      fileName: () => 'wallpaper.js',
      cssFileName: 'wallpaper',
    },
    license: { fileName: 'THIRD-PARTY-LICENSES.md' },
  },
}))
