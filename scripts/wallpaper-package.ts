import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { projectProperties } from '../src/wallpaper/settings.ts'

/** Use the same HTML in dev and production, replacing only the development entry. */
export function wallpaperPackage(): Plugin {
  return {
    name: 'wallpaper-package',
    apply: 'build',
    enforce: 'post',
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const entry = Object.values(bundle).find(item => item.type === 'chunk' && item.isEntry)
        const css = Object.values(bundle).filter(item => item.type === 'asset' && item.fileName.endsWith('.css'))
        if (!entry || entry.type !== 'chunk' || css.length !== 1) {
          this.error('Wallpaper packaging requires one JavaScript entry and one stylesheet.')
        }
        const template = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8')
        const moduleEntry = '<script type="module" src="/src/main.tsx"></script>'
        if (template.split(moduleEntry).length !== 2) {
          this.error('Expected exactly one development module entry in index.html.')
        }
        this.emitFile({
          type: 'asset',
          fileName: 'index.html',
          source: template
            .replace('</head>', `  <link rel="stylesheet" href="./${css[0].fileName}" />\n  </head>`)
            .replace(moduleEntry, `<script src="./${entry.fileName}"></script>`),
        })
        this.emitFile({ type: 'asset', fileName: 'LICENSE.txt', source: readFileSync(new URL('../LICENSE.txt', import.meta.url)) })
        const project = JSON.parse(readFileSync(new URL('../project.json', import.meta.url), 'utf8'))
        this.emitFile({ type: 'asset', fileName: 'project.json', source: JSON.stringify({
          ...project, general: { ...project.general, properties: projectProperties() },
        }, null, 2) + '\n' })
      },
    },
  }
}
