import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import { wallpaperPackage } from './scripts/wallpaper-package.ts'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: './',
  // Vite library builds preserve process.env by default; the wallpaper has no Node runtime.
  define: { 'process.env.NODE_ENV': JSON.stringify(command === 'build' ? 'production' : 'development') },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    wallpaperPackage(),
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
