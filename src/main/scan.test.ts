import { describe, it, expect } from 'vitest'
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pairFiles, scanFolder } from './scan'

const F = '/photos'

describe('pairFiles', () => {
  it('pairs a HEIC still with its MOV video by basename', () => {
    const items = pairFiles(F, ['IMG_1234.HEIC', 'IMG_1234.MOV'])
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      name: 'IMG_1234',
      isLive: true,
      ext: 'heic',
      stillPath: '/photos/IMG_1234.HEIC',
      videoPath: '/photos/IMG_1234.MOV'
    })
  })

  it('treats a JPG+MOV pair as live too (format tolerance)', () => {
    const items = pairFiles(F, ['IMG_1.JPG', 'IMG_1.MOV'])
    expect(items[0].isLive).toBe(true)
    expect(items[0].ext).toBe('jpg')
  })

  it('matches regardless of filename/extension case', () => {
    const items = pairFiles(F, ['img_9.heic', 'IMG_9.mov'])
    expect(items).toHaveLength(1)
    expect(items[0].isLive).toBe(true)
  })

  it('keeps a lone still as a non-live photo', () => {
    const items = pairFiles(F, ['photo.jpg'])
    expect(items).toHaveLength(1)
    expect(items[0].isLive).toBe(false)
    expect(items[0].videoPath).toBeNull()
  })

  it('ignores a video with no still to display', () => {
    const items = pairFiles(F, ['clip.mov'])
    expect(items).toHaveLength(0)
  })

  it('ignores unrelated file types', () => {
    const items = pairFiles(F, ['notes.txt', 'IMG_2.HEIC', 'archive.zip'])
    expect(items.map((i) => i.name)).toEqual(['IMG_2'])
  })

  it('prefers HEIC over JPG when a basename has both stills', () => {
    const items = pairFiles(F, ['IMG_5.JPG', 'IMG_5.HEIC', 'IMG_5.MOV'])
    expect(items).toHaveLength(1)
    expect(items[0].ext).toBe('heic')
    expect(items[0].isLive).toBe(true)
  })

  it('prefers MOV over MP4 for the video half', () => {
    const items = pairFiles(F, ['IMG_6.HEIC', 'IMG_6.MP4', 'IMG_6.MOV'])
    expect(items[0].videoPath).toBe('/photos/IMG_6.MOV')
  })

  it('sorts naturally so IMG_2 precedes IMG_10', () => {
    const items = pairFiles(F, ['IMG_10.HEIC', 'IMG_2.HEIC', 'IMG_1.HEIC'])
    expect(items.map((i) => i.name)).toEqual(['IMG_1', 'IMG_2', 'IMG_10'])
  })

  it('handles dotted basenames without dropping the extension logic', () => {
    const items = pairFiles(F, ['my.photo.v2.heic', 'my.photo.v2.mov'])
    expect(items).toHaveLength(1)
    expect(items[0].name).toBe('my.photo.v2')
    expect(items[0].isLive).toBe(true)
  })
})

describe('scanFolder (filesystem)', () => {
  it('reads a real folder, pairs files, and ignores subdirectories', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'lpv-scan-'))
    try {
      await writeFile(join(dir, 'IMG_1.HEIC'), '')
      await writeFile(join(dir, 'IMG_1.MOV'), '')
      await writeFile(join(dir, 'IMG_2.JPG'), '')
      await writeFile(join(dir, 'readme.txt'), '')
      await mkdir(join(dir, 'IMG_9.HEIC')) // a directory named like a still — must be skipped

      const result = await scanFolder(dir)
      expect(result.folder).toBe(dir)
      expect(result.photoCount).toBe(2)
      expect(result.liveCount).toBe(1)
      expect(result.items.map((i) => i.name)).toEqual(['IMG_1', 'IMG_2'])
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
