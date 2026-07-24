import { useEffect, useState } from 'react'
import type { Diagnostics } from '@shared/types'

export default function App(): React.JSX.Element {
  const [diag, setDiag] = useState<Diagnostics | null>(null)
  const [folder, setFolder] = useState<string | null>(null)

  useEffect(() => {
    window.viewer.getDiagnostics().then(setDiag)
  }, [])

  async function handleOpen(): Promise<void> {
    const chosen = await window.viewer.openFolder()
    if (chosen) setFolder(chosen)
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
          {folder ? (
            <>
              Selected: <code>{folder}</code> — scanning arrives in the next milestone.
            </>
          ) : (
            'Choose a folder of iPhone photos to begin.'
          )}
        </p>

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
