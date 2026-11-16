import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ImageCatalogue } from '../../src/wallpaper/catalogue.ts'
import { imageName, localFileId, localFileUrl } from '../../src/wallpaper/paths.ts'

function urls() {
  const created: string[] = []; const revoked: string[] = []
  return { created, revoked, createObjectURL: (_file: File) => { const url = `blob:test/${created.length}`; created.push(url); return url }, revokeObjectURL: (url: string) => { revoked.push(url) } }
}

test('raw Windows paths preserve spaces, Unicode and literal URL-reserved characters', () => {
  const url = localFileUrl('C:\\My Photos\\夜 #%20?\'().JPG')
  assert.equal(url, 'file:///C:/My%20Photos/%E5%A4%9C%20%23%2520%3F%27%28%29.JPG')
  assert.equal(imageName(url), "夜 #%20?'().JPG")
  assert.equal(localFileUrl(url), url)
})

test('UNC paths, POSIX paths, and already encoded file URLs remain local and usable', () => {
  assert.equal(localFileUrl('\\\\NAS\\Shared Photos\\a #1.png'), 'file://nas/Shared%20Photos/a%20%231.png')
  assert.equal(localFileUrl('/home/user/a #1.png'), 'file:///home/user/a%20%231.png')
  assert.equal(localFileUrl('file:///C:/My%20Photos/a%231.jpg'), 'file:///C:/My%20Photos/a%231.jpg')
  assert.equal(localFileId('file:///C:/Photos/A.JPG'), localFileId('file:///c:/photos/a.jpg'))
  assert.notEqual(localFileId('file:///home/A.JPG'), localFileId('file:///home/a.jpg'))
  for (const value of ['relative/a.jpg', 'C:a.jpg', 'https://example.com/a.jpg', 'file:relative.jpg', 'file:///C:/a.jpg#fragment', 'file:///C:/bad%ZZ.jpg', '//server', '']) assert.throws(() => localFileUrl(value))
})

test('directory updates keep only image metadata, replace revisions, deduplicate Windows names and remove case-insensitively', () => {
  const api = urls(); const catalogue = new ImageCatalogue(api)
  catalogue.changeFiles(['C:/Photos/A.JPG', 'C:/Photos/b.png', 'C:/Photos/movie.mp4', 'relative.jpg'])
  assert.equal(catalogue.images('directory').length, 2)
  const original = catalogue.images('directory')[0]
  catalogue.changeFiles(['c:\\photos\\a.jpg'])
  const updated = catalogue.images('directory')[0]
  assert.equal(catalogue.images('directory').length, 2)
  assert.equal(updated.id, original.id); assert.ok(updated.revision > original.revision)
  catalogue.removeFiles(['C:/PHOTOS/A.JPG', 'missing.jpg'])
  assert.deepEqual(catalogue.images('directory').map(image => image.name), ['b.png'])
  assert.equal(api.created.length, 0)
})

test('initial directory properties preserve early callbacks; replacement and clearing discard old selections', () => {
  const catalogue = new ImageCatalogue(urls())
  catalogue.changeFiles(['C:/A/early.jpg'])
  catalogue.setDirectory('C:/A')
  assert.equal(catalogue.images('directory').length, 1)
  catalogue.setDirectory('c:\\a')
  assert.equal(catalogue.images('directory').length, 1)
  catalogue.setDirectory('C:/B')
  assert.equal(catalogue.images('directory').length, 0)
  catalogue.changeFiles(['C:/B/new.jpg'])
  catalogue.setDirectory('')
  assert.equal(catalogue.images('directory').length, 0)
})

test('large folders enumerate references without allocating browser object URLs or reading image bytes', () => {
  const api = urls(); const catalogue = new ImageCatalogue(api)
  catalogue.changeFiles(Array.from({ length: 175 }, (_, i) => `C:/Photos/${i}.jpg`))
  assert.equal(catalogue.images('directory').length, 175)
  assert.equal(api.created.length, 0)
  assert.equal(catalogue.images('samples').length, 4)
})

test('folder replacement preserves early new-folder callbacks and excludes late callbacks from the old root', () => {
  const catalogue = new ImageCatalogue(urls())
  catalogue.setDirectory('C:/Old')
  catalogue.changeFiles(['C:/Old/old.jpg'])
  catalogue.changeFiles(['C:/New/new.jpg'])
  assert.deepEqual(catalogue.images('directory').map(image => image.name), ['old.jpg'])
  catalogue.setDirectory('C:/New')
  assert.deepEqual(catalogue.images('directory').map(image => image.name), ['new.jpg'])
  catalogue.changeFiles(['C:/Old/late.jpg'])
  assert.deepEqual(catalogue.images('directory').map(image => image.name), ['new.jpg'])
  catalogue.setDirectory('C:/NewSibling')
  assert.equal(catalogue.images('directory').length, 0)
})

test('preview files are filtered, single-image imports are bounded, and replacement/disposal revokes owned URLs', () => {
  const api = urls(); const catalogue = new ImageCatalogue(api)
  const files = [new File(['x'], 'a.jpg'), new File(['x'], 'b.PNG'), new File(['x'], 'notes.txt')]
  catalogue.importFiles('image', files)
  assert.equal(catalogue.images('image').length, 1)
  catalogue.importFiles('directory', files)
  assert.equal(catalogue.images('directory').length, 2)
  catalogue.importFiles('image', [files[1]])
  assert.deepEqual(api.revoked, ['blob:test/0'])
  catalogue.dispose(); catalogue.dispose()
  assert.deepEqual([...api.revoked].sort(), [...api.created].sort())
})

test('a failed preview import releases partial work and preserves the previous selection', () => {
  const api = urls(); const catalogue = new ImageCatalogue(api)
  catalogue.importFiles('directory', [new File(['x'], 'old.jpg')])
  const original = catalogue.images('directory')
  const create = api.createObjectURL; let calls = 0
  api.createObjectURL = file => { if (++calls === 2) throw new Error('cannot allocate'); return create(file) }
  assert.throws(() => catalogue.importFiles('directory', [new File(['x'], 'new.jpg'), new File(['x'], 'next.jpg')]), /cannot allocate/)
  assert.equal(catalogue.images('directory'), original)
  assert.deepEqual(api.revoked, ['blob:test/1'])
  catalogue.dispose()
  assert.deepEqual([...api.revoked].sort(), [...api.created].sort())
})
