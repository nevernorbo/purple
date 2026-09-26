import type { LabelColor } from "purple-server"

/**
 * Label colors mapped onto Risk of Rain 2 item rarities. Stored names are kept;
 * only the rendered hue changes (e.g. `teal` renders as equipment orange).
 */
export const LABEL_COLORS: Record<
  LabelColor,
  { dot: string; chip: string; rarity: string }
> = {
  purple: {
    rarity: "Void",
    dot: "bg-rarity-void",
    chip: "border-l-rarity-void bg-rarity-void/14 text-rarity-void",
  },
  blue: {
    rarity: "Lunar",
    dot: "bg-rarity-lunar",
    chip: "border-l-rarity-lunar bg-rarity-lunar/14 text-rarity-lunar",
  },
  green: {
    rarity: "Uncommon",
    dot: "bg-rarity-uncommon",
    chip: "border-l-rarity-uncommon bg-rarity-uncommon/14 text-rarity-uncommon",
  },
  amber: {
    rarity: "Boss",
    dot: "bg-rarity-boss",
    chip: "border-l-rarity-boss bg-rarity-boss/16 text-rarity-boss",
  },
  red: {
    rarity: "Legendary",
    dot: "bg-rarity-legendary",
    chip: "border-l-rarity-legendary bg-rarity-legendary/14 text-rarity-legendary",
  },
  pink: {
    rarity: "Pink",
    dot: "bg-rarity-pink",
    chip: "border-l-rarity-pink bg-rarity-pink/14 text-rarity-pink",
  },
  teal: {
    rarity: "Equipment",
    dot: "bg-rarity-equipment",
    chip: "border-l-rarity-equipment bg-rarity-equipment/14 text-rarity-equipment",
  },
  slate: {
    rarity: "Common",
    dot: "bg-rarity-common",
    chip: "border-l-rarity-common bg-rarity-common/12 text-rarity-common",
  },
}

export const LABEL_COLOR_KEYS = Object.keys(LABEL_COLORS) as LabelColor[]
