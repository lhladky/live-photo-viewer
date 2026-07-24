import { useCallback, useEffect, useRef, useState } from 'react'
import type { GalleryItem } from '@shared/types'
import { useHoldToPlay } from '../hooks/useHoldToPlay'

interface Props {
  item: GalleryItem | null
}

/**
 * Main preview pane. Shows the still image; for Live Photos, press-and-hold
 * plays the paired video once (or until released) then reverts to the still.
 * The video is prepared (remuxed/transcoded) on selection so holding is snappy.
 */
export function Preview({ item }: Props): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const wantPlay = useRef(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [playing, setPlaying] = useState(false)

  const isLive = !!item?.isLive && !!item.videoPath

  // On selection: reset, then prefetch the playable video in the background.
  useEffect(() => {
    wantPlay.current = false
    setVideoUrl(null)
    setPlaying(false)
    setPreparing(false)
    if (!item || !isLive || !item.videoPath) {
      return
    }
    let alive = true
    window.viewer.getVideo(item.videoPath).then((url) => {
      if (alive) {
        setVideoUrl(url)
      }
    })
    return () => {
      alive = false
    }
  }, [item, isLive])

  const doPlay = useCallback(() => {
    const v = videoRef.current
    if (!v) {
      return
    }
    setPreparing(false)
    setPlaying(true)
    v.currentTime = 0
    void v.play().catch(() => setPlaying(false))
  }, [])

  const start = useCallback(() => {
    if (!isLive) {
      return
    }
    wantPlay.current = true
    if (videoUrl) {
      doPlay()
    } else {
      setPreparing(true)
    } // auto-plays once prepared (effect below)
  }, [isLive, videoUrl, doPlay])

  const stop = useCallback(() => {
    wantPlay.current = false
    setPreparing(false)
    setPlaying(false)
    videoRef.current?.pause()
  }, [])

  // If the video finished preparing while the user is still holding, play it.
  useEffect(() => {
    if (videoUrl && wantPlay.current) {
      doPlay()
    }
  }, [videoUrl, doPlay])

  const hold = useHoldToPlay({ enabled: isLive, onStart: start, onStop: stop })

  if (!item) {
    return <div className="preview preview--empty">Select a photo below</div>
  }

  const stillSrc = window.viewer.mediaUrl(item.stillPath)

  return (
    <div className="preview" {...hold}>
      <img
        className="preview__img"
        src={stillSrc}
        alt={item.name}
        draggable={false}
        style={{ opacity: playing ? 0 : 1 }}
      />
      {videoUrl && (
        <video
          ref={videoRef}
          className="preview__video"
          src={videoUrl}
          muted
          playsInline
          preload="auto"
          draggable={false}
          onEnded={stop}
          style={{ opacity: playing ? 1 : 0 }}
        />
      )}
      {isLive && (
        <span className="preview__live">
          {preparing ? '● preparing…' : playing ? '● LIVE' : '● LIVE — hold to play'}
        </span>
      )}
    </div>
  )
}
