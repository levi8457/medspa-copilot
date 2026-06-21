"use client"

import { useEffect, useRef, useState } from "react"
import { Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react"
import WaveSurfer from "wavesurfer.js"

interface AudioPlayerProps {
  url: string
  onTimeUpdate?: (currentTime: number) => void
  onReady?: (duration: number) => void
}

export function AudioPlayer({ url, onTimeUpdate, onReady }: AudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!containerRef.current) return

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "rgba(0, 229, 255, 0.3)",
      progressColor: "#00E5FF",
      cursorColor: "#7C4DFF",
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 60,
      normalize: true,
      backend: "WebAudio",
    })

    ws.load(url)
    wavesurferRef.current = ws

    ws.on("ready", () => {
      setIsLoading(false)
      setDuration(ws.getDuration())
      onReady?.(ws.getDuration())
    })

    ws.on("audioprocess", () => {
      setCurrentTime(ws.getCurrentTime())
      onTimeUpdate?.(ws.getCurrentTime())
    })

    ws.on("play", () => setIsPlaying(true))
    ws.on("pause", () => setIsPlaying(false))
    ws.on("finish", () => setIsPlaying(false))

    ws.on("error", (err) => {
      console.error("WaveSurfer error:", err)
      setIsLoading(false)
    })

    return () => {
      ws.destroy()
    }
  }, [url, onTimeUpdate, onReady])

  const togglePlay = () => {
    wavesurferRef.current?.playPause()
  }

  const toggleMute = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setMuted(!isMuted)
      setIsMuted(!isMuted)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    wavesurferRef.current?.setVolume(newVolume)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    wavesurferRef.current?.seekTo(time / duration)
    setCurrentTime(time)
  }

  const reset = () => {
    wavesurferRef.current?.seekTo(0)
    setCurrentTime(0)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-4 space-y-3">
      <div ref={containerRef} className="w-full" />

      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          disabled={isLoading}
          className="w-10 h-10 rounded-full bg-[var(--primary)] text-[var(--background)] flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        <button onClick={reset} className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors">
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs text-[var(--foreground-secondary)] w-10 text-right">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 bg-[var(--border)] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[var(--primary)] [&::-webkit-slider-thumb]:rounded-full"
          />
          <span className="text-xs text-[var(--foreground-secondary)] w-10">{formatTime(duration)}</span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={toggleMute} className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors">
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 bg-[var(--border)] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[var(--primary)] [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>
      </div>
    </div>
  )
}
