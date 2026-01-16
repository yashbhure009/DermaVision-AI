"use client"

import { useState } from "react"
import Image from "next/image"
import { motion } from "framer-motion"

interface SkinCondition {
  id: string
  name: string
  description: string
  image: string
}

const skinConditions: SkinCondition[] = [
  {
    id: "skin-cancer",
    name: "Skin Cancer",
    description: "Often appears as a new or changing mole, a pearly bump, or a sore that doesn't heal.",
    image: "/images/skin-cancer.png",
  },
  {
    id: "eczema",
    name: "Eczema",
    description: "A chronic condition causing dry, itchy, and inflamed patches of skin that can weep or crust.",
    image: "/images/skin-eczema.png",
  },
  {
    id: "fungal",
    name: "Fungal Infection",
    description: "Typically presents as red, itchy, scaly rings or patches, such as athlete's foot or ringworm.",
    image: "/images/skin-fungal.png",
  },
  {
    id: "rash",
    name: "Rapidly Growing Rash",
    description: "A fast-spreading area of skin irritation that may indicate an acute allergic reaction or infection.",
    image: "/images/skin-rash.png",
  },
  {
    id: "psoriasis",
    name: "Psoriasis",
    description: "An autoimmune disease causing thick, red, itchy patches covered with silvery scales.",
    image: "/images/skin-psoriasis.png",
  },
]

// Duplicate the array for seamless infinite loop
const duplicatedConditions = [...skinConditions, ...skinConditions]

export function SkinConditionsCarousel() {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div className="w-full overflow-hidden py-4">
      <h3 className="text-xl font-bold text-black mb-4 text-center">Conditions We Screen</h3>

      {/* Carousel Container */}
      <div className="relative">
        <motion.div
          className="flex gap-4"
          animate={{
            x: [0, -1 * (skinConditions.length * 180)],
          }}
          transition={{
            x: {
              duration: 20,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            },
          }}
        >
          {duplicatedConditions.map((condition, index) => (
            <motion.div
              key={`${condition.id}-${index}`}
              className="relative flex-shrink-0 w-44 h-56 rounded-xl overflow-hidden shadow-lg cursor-pointer"
              onHoverStart={() => setHoveredId(`${condition.id}-${index}`)}
              onHoverEnd={() => setHoveredId(null)}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              {/* Image */}
              <Image src={condition.image || "/placeholder.svg"} alt={condition.name} fill className="object-cover" />

              {/* Default title at bottom */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <h4 className="text-white font-bold text-sm">{condition.name}</h4>
              </div>

              {/* Hover overlay with description */}
              <motion.div
                className="absolute inset-0 bg-derma-teal-dark/90 p-4 flex flex-col justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: hoveredId === `${condition.id}-${index}` ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <h4 className="text-white font-bold text-base mb-2">{condition.name}</h4>
                <p className="text-white/90 text-xs leading-relaxed">{condition.description}</p>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <p className="text-center text-xs text-gray-500 mt-4">
        For educational purposes only. Not a substitute for professional medical advice.
      </p>
    </div>
  )
}
