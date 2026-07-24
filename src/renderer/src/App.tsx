import { useEffect, useState } from 'react'
import type { Diagnostics, ScanResult } from '@shared/types'

export default function App(): React.JSX.Element {
  const [diag, setDiag] = useState<Diagnostics | null>(null)
  const [scan, setScan] = useState<ScanResult | null>(null)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    window.viewer.getDiagnostics().then(setDiag)
  }, [])

  async function handleOpen(): Promise<void> {
    const chosen = await window.viewer.openFolder()
    if (!chosen) return
    setScanning(true)
    setScan(null)
    try {
      const result = await window.viewer.scanFolder(chosen)
      setScan(result)
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>Live Photo Viewer</h1>
        <button className="btn" onClick={handleOpen}>
          Open folder…
        </button>
      </header>

      <main className="content">
        <p className="hint">
          {scanning ? (
            'Scanning…'
          ) : scan ? (
            <>
              <code>{scan.folder}</code> — {scan.photoCount} photos, {scan.liveCount} live.
            </>
          ) : (
            'Choose a folder of iPhone photos to begin.'
          )}
        </p>

        {scan && (
          <ul className="filelist">
            {scan.items.slice(0, 500).map((item) => (
              <li key={item.id}>
                {item.isLive && <span className="live-tag">LIVE</span>}
                <span className="fname">{item.name}</span>
                <span className="fext">.{item.ext}</span>
              </li>
            ))}
            {scan.items.length > 500 && (
              <li className="more">
                …and {scan.items.length - 500} more (virtualized gallery in M3)
              </li>
            )}
          </ul>
        )}

        <section className="diag">
          <h2>Diagnostics (M1 spike)</h2>
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
              <Row
                k="HEVC decode"
                v={diag.ffmpegHevcDecode ? 'yes ✓' : 'no ✗ (transcode may fail)'}
              />
              <Row
                k="HEIF/HEIC demux"
                v={diag.ffmpegHeifDemux ? 'yes ✓' : 'no — will use libheif-js fallback'}
              />
            </dl>
          )}
        </section>
      </main>
    </div>
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
