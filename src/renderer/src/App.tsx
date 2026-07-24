import { useEffect, useState } from 'react'
import type { Diagnostics, ScanResult } from '@shared/types'
import { Gallery } from './components/Gallery'

export default function App(): React.JSX.Element {
  const [diag, setDiag] = useState<Diagnostics | null>(null)
  const [scan, setScan] = useState<ScanResult | null>(null)
  const [scanning, setScanning] = useState(false)

  async function loadFolder(folder: string): Promise<void> {
    setScanning(true)
    setScan(null)
    try {
      setScan(await window.viewer.scanFolder(folder))
    } finally {
      setScanning(false)
    }
  }

  useEffect(() => {
    window.viewer.getDiagnostics().then(setDiag)
    // Auto-open a folder passed via CLI arg / LPV_OPEN.
    window.viewer.getInitialFolder().then((folder) => {
      if (folder) loadFolder(folder)
    })
  }, [])

  async function handleOpen(): Promise<void> {
    const chosen = await window.viewer.openFolder()
    if (chosen) loadFolder(chosen)
  }

  return (
    <div className="app">
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

      {scan ? <Gallery items={scan.items} /> : <StartScreen scanning={scanning} diag={diag} />}
    </div>
  )
}

function StartScreen({
  scanning,
  diag
}: {
  scanning: boolean
  diag: Diagnostics | null
}): React.JSX.Element {
  return (
    <main className="content">
      <p className="hint">
        {scanning ? 'Scanning…' : 'Choose a folder of iPhone photos to begin.'}
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
