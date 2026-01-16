"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import * as tmImage from "@teachablemachine/image"
import { Camera, RefreshCw } from "lucide-react"

interface SkinScannerProps {
  onCapture: (imageSrc: string) => void
}

export default function SkinScanner({ onCapture }: SkinScannerProps) {
  const webcamRef = useRef<HTMLDivElement>(null)
  const [webcam, setWebcam] = useState<tmImage.Webcam | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let webcamInstance: tmImage.Webcam | null = null

    // Helper to stop webcam safely without crashing
    const safeStop = (wc: tmImage.Webcam | null) => {
        if (!wc) return;
        try {
            // This try-catch blocks the 'srcObject' error
            if (wc.stop) wc.stop();
        } catch (e) {
            console.warn("Webcam cleanup warning (safe to ignore):", e);
        }
    }

    const initWebcam = async () => {
      try {
        // 1. Setup Webcam (300x300, flip=true)
        webcamInstance = new tmImage.Webcam(300, 300, true)
        await webcamInstance.setup() // Request access
        
        if (mounted) {
           await webcamInstance.play()
           setWebcam(webcamInstance)
           setIsLoading(false)
           
           // 2. Append Canvas SAFELY via Ref
           if (webcamRef.current && webcamInstance.canvas) {
             webcamRef.current.innerHTML = ''
             webcamRef.current.appendChild(webcamInstance.canvas)
           }
           
           // 3. Start Animation Loop
           window.requestAnimationFrame(loop)
        } else {
            // Component unmounted while loading -> stop immediately
            safeStop(webcamInstance)
        }
      } catch (error) {
        console.error("Webcam Error:", error)
        if (mounted) setIsLoading(false)
      }
    }

    const loop = () => {
      // Only update if mounted and valid
      if (mounted && webcamInstance && webcamInstance.canvas) {
        webcamInstance.update()
        window.requestAnimationFrame(loop)
      }
    }

    initWebcam()

    // 4. CLEANUP
    return () => {
      mounted = false
      safeStop(webcamInstance)
    }
  }, [])

  const capture = () => {
    if (webcam && webcam.canvas) {
      // Convert current frame to Base64 image
      const imageSrc = webcam.canvas.toDataURL("image/png")
      onCapture(imageSrc)
    }
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative overflow-hidden rounded-2xl border-4 border-derma-teal shadow-2xl bg-black">
        {/* The Webcam Canvas goes inside this Ref div */}
        <div ref={webcamRef} className="flex" />
        
        {isLoading && (
           <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white" style={{ width: 300, height: 300 }}>
             <RefreshCw className="w-8 h-8 animate-spin text-derma-teal" />
           </div>
        )}
      </div>

      <p className="text-gray-400 mt-4 text-sm">Align skin area within the frame</p>

      <button
        onClick={capture}
        disabled={isLoading}
        className="mt-6 bg-derma-teal hover:bg-derma-teal-dark text-white rounded-full p-6 shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Camera className="w-8 h-8" />
      </button>
    </div>
  )
}