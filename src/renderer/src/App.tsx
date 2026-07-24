import { useEffect, useState } from 'react'
import type { Diagnostics, ScanResult } from '@shared/types'
import { Gallery } from './components/Gallery'

export default function App(): React.JSX.Element {
  const [diag, setDiag] = useState<Diagnostics | null>(null)
  const [scan, setScan] = useState<ScanResult | null>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  async function loadFolder(folder: string): Promise<void> {
    setScanning(true)
    setScan(null)
    setError(null)
    try {
      setScan(await window.viewer.scanFolder(folder))
    } catch (err) {
      setError(`Could not read that folder: ${(err as Error).message ?? err}`)
    } finally {
      setScanning(false)
    }
  }

  useEffect(() => {
    window.viewer.getDiagnostics().then(setDiag)
    // Auto-open a folder passed via CLI arg / LPV_OPEN.
    window.viewer.getInitialFolder().then((folder) => {
      if (folder) {
        loadFolder(folder)
      }
    })
  }, [])

  async function handleOpen(): Promise<void> {
    const chosen = await window.viewer.openFolder()
    if (chosen) {
      loadFolder(chosen)
    }
  }

  function onDrop(e: React.DragEvent): void {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) {
      return
    }
    const path = window.viewer.getPathForFile(file)
    if (path) {
      loadFolder(path)
    }
  }

  function onDragOver(e: React.DragEvent): void {
    e.preventDefault()
    setDragging(true)
  }

  const hasGallery = scan && scan.items.length > 0

  return (
    <div
      className="app"
      onDragOver={onDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <header className="topbar">
        <h1>Live Photo Viewer</h1>
        <div className="topbar__meta">
          {scan && (
            <span className="counts">
              {scan.photoCount} photos · {scan.liveCount} live
            </span>
          )}
          <button className="btn" onClick={handleOpen}>
            Open folder…
          </button>
        </div>
      </header>

      {hasGallery ? (
        <Gallery items={scan.items} />
      ) : (
        <StartScreen
          scanning={scanning}
          diag={diag}
          error={error}
          empty={!!scan && scan.items.length === 0}
        />
      )}

      {dragging && <div className="dropzone">Drop a folder to open</div>}
    </div>
  )
}

function StartScreen({
  scanning,
  diag,
  error,
  empty
}: {
  scanning: boolean
  diag: Diagnostics | null
  error: string | null
  empty: boolean
}): React.JSX.Element {
  return (
    <main className="content">
      <p className="hint">
        {scanning
          ? 'Scanning…'
          : error
            ? error
            : empty
              ? 'No photos found in this folder. Try another.'
              : 'Choose a folder of iPhone photos, or drag one onto the window.'}
      </p>

      <section className="diag">
        <h2>Diagnostics</h2>
        {!diag ? (
          <p>Loading…</p>
        ) : (
          <dl>
            <Row k="Electron" v={diag.electron} />
            <Row k="Chromium" v={diag.chrome} />
            <Row k="Node" v={diag.node} />
            <Row k="Platform" v={diag.platform} />
            <Row k="ffmpeg" v={diag.ffmpegPath ?? 'MISSING'} />
            <Row k="ffprobe" v={diag.ffprobePath ?? 'MISSING'} />
            <Row k="HEVC decode" v={diag.ffmpegHevcDecode ? 'yes ✓' : 'no ✗'} />
            <Row
              k="HEIF/HEIC demux"
              v={diag.ffmpegHeifDemux ? 'yes ✓' : 'no — HEIC uses libheif-js (experimental)'}
            />
          </dl>
        )}
      </section>
    </main>
  )
}

function Row({ k, v }: { k: string; v: string }): React.JSX.Element {
  return (
    <>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </>
  )
}
