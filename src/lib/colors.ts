/**
 * Calculates luminance for a HEX color and returns either '#FFFFFF' (for dark background)
 * or '#000000' (for light background) to guarantee text accessibility and contrast.
 */
export function getContrastTextColor(hexColor?: string | null): string {
  if (!hexColor) return '#FFFFFF'
  
  const hex = hexColor.replace('#', '').trim()
  if (hex.length !== 6) return '#FFFFFF'

  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  if (isNaN(r) || isNaN(g) || isNaN(b)) return '#FFFFFF'

  // W3C relative luminance formula (YIQ algorithm)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 128 ? '#000000' : '#FFFFFF'
}
