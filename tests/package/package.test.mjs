import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, dirname, relative, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { Script } from 'node:vm'
import { parseSync, traverse } from '@babel/core'
import { defaults, projectProperties } from '../../src/wallpaper/settings.ts'

const root = fileURLToPath(new URL('../../', import.meta.url))
const dist = resolve(root, 'dist')
const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
function read(path) { return readFileSync(resolve(dist, path), 'utf8') }
function localAsset(url, from = 'index.html') {
  assert.ok(!/^(?:[a-z][\w+.-]*:|\/|\\)/i.test(url), `Expected relative local asset: ${url}`)
  const target = resolve(dirname(resolve(dist, from)), decodeURIComponent(url.split(/[?#]/)[0]))
  const rel = relative(dist, target)
  assert.ok(rel !== '..' && !rel.startsWith('../') && !rel.startsWith('..\\') && !isAbsolute(rel), `Asset escapes package: ${url}`)
  assert.ok(existsSync(target), `Missing packaged asset: ${url}`)
}

test('package identifies the application release consistently without runtime version requests', () => {
  assert.deepEqual(JSON.parse(read('version.json')), { name: 'Slideshow Studio', version })
  assert.ok(read('index.html').includes(`<meta name="application-version" content="${version}"`))
})

test('metadata points to packaged HTML and preview; licenses are included', () => {
  const project = JSON.parse(read('project.json'))
  assert.equal(project.type, 'web')
  assert.equal(project.file, 'index.html')
  assert.equal(project.title, 'Slideshow Studio')
  assert.deepEqual(project.general.properties, projectProperties())
  assert.deepEqual(Object.keys(project.general.properties).sort(), Object.keys(defaults).sort())
  assert.equal(project.general.properties.imagedirectory.mode, 'fetchall')
  localAsset(project.file); localAsset(project.preview)
  assert.ok(read('LICENSE.txt').includes('GNU GENERAL PUBLIC LICENSE'))
  assert.ok(read('THIRD-PARTY-LICENSES.md').includes('react'))
})

test('HTML references local assets and installs the bridge before the classic app entry', () => {
  const html = read('index.html')
  const scripts = [...html.matchAll(/<script\b([^>]*)\bsrc="([^"]+)"[^>]*><\/script>/g)]
  assert.deepEqual(scripts.map(match => match[2]), ['./wallpaper-bridge.js', './wallpaper.js'])
  for (const match of scripts) assert.doesNotMatch(match[1], /\b(?:type|async|defer)\s*=/)
  assert.ok(html.indexOf('wallpaper-bridge.js') < html.indexOf('id="root"'))
  assert.ok(html.indexOf('id="root"') < html.indexOf('src="./wallpaper.js"'))
  assert.match(html, /href="\.\/wallpaper\.css"/)
  assert.doesNotMatch(html, /type="module"|modulepreload|\/src\/|@vite\/client/)
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) localAsset(match[1])
})

test('all built scripts parse as classic JavaScript and contain no runtime module or Node imports', () => {
  const scripts = readdirSync(dist).filter(file => file.endsWith('.js'))
  assert.deepEqual(scripts.sort(), ['wallpaper-bridge.js', 'wallpaper.js'])
  for (const file of scripts) {
    const source = read(file)
    assert.doesNotThrow(() => new Script(source, { filename: file }))
    // Inspect executable syntax so JSDoc type imports and React's diagnostic strings are ignored.
    const ast = parseSync(source, { sourceType: 'script', configFile: false, babelrc: false })
    traverse(ast, {
      ImportExpression() { assert.fail(`Runtime dynamic import in ${file}`) },
      MetaProperty(path) { assert.notEqual(path.node.meta.name, 'import', `import.meta in ${file}`) },
      MemberExpression(path) {
        const { object, property } = path.node
        assert.ok(!(object.type === 'Identifier' && object.name === 'process' && property.type === 'Identifier' && property.name === 'env'), `process.env in ${file}`)
      },
      CallExpression(path) {
        const { callee, arguments: args } = path.node
        if (callee.type === 'Identifier' && callee.name === 'require' && args[0]?.type === 'StringLiteral') {
          assert.ok(!/^(node:|fs$|path$)/.test(args[0].value), `Node import in ${file}`)
        }
      },
    })
  }
})

test('CSS URLs are local and all four sample files are copied intact, including uppercase extensions', () => {
  const css = read('wallpaper.css')
  assert.doesNotMatch(css, /@import\b/)
  for (const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) localAsset(match[1], 'wallpaper.css')
  assert.deepEqual(readFileSync(resolve(dist, 'materials/acrylic-grain.svg')), readFileSync(resolve(root, 'public/materials/acrylic-grain.svg')))
  const samples = readdirSync(resolve(root, 'public/wallpapers'))
  assert.equal(samples.length, 4)
  assert.deepEqual(readdirSync(resolve(dist, 'wallpapers')).sort(), samples.sort())
  for (const file of samples) {
    const packaged = readFileSync(resolve(dist, 'wallpapers', file))
    assert.deepEqual(packaged, readFileSync(resolve(root, 'public/wallpapers', file)))
    assert.ok(!packaged.subarray(0, 100).toString().startsWith('version https://git-lfs.github.com/spec/v1'), `LFS pointer packaged instead of image: ${file}`)
  }
  for (const asset of ['icons.svg', 'assets/react.svg', 'assets/vite.svg']) assert.ok(!existsSync(resolve(dist, asset)))
})
