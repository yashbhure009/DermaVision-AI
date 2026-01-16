"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"

interface SplashScreenProps {
  children: React.ReactNode
}

export function SplashScreen({ children }: SplashScreenProps) {
  const [showSplash, setShowSplash] = useState(true)
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    // Start fading out splash after 1.5s
    const timer = setTimeout(() => {
      setShowContent(true)
      // Unmount splash after animation completes
      setTimeout(() => {
        setShowSplash(false)
      }, 600)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-white"
            initial={{ opacity: 1 }}
            animate={{ opacity: showContent ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <motion.div
              initial={{ scale: 1, opacity: 1 }}
              animate={{
                scale: showContent ? 1.15 : 1,
                opacity: showContent ? 0 : 1,
              }}
              transition={{
                duration: 0.6,
                ease: [0.4, 0, 0.2, 1],
              }}
            >
              <Image
                src="/images/dermavision-logo.png"
                alt="DermaVision AI"
                width={120}
                height={120}
                priority
                className="rounded-3xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{
          opacity: showContent ? 1 : 0,
          scale: showContent ? 1 : 0.96,
        }}
        transition={{
          duration: 0.5,
          ease: "easeOut",
          delay: showContent ? 0 : 0,
        }}
      >
        {children}
      </motion.div>
    </>
  )
}
