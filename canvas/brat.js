const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas')
const { writeFileSync, existsSync, readFileSync } = require('fs')
const path = require('path')

const TOP_TEXT = 'bego tolol'
const MID_TEXT = 'anak hebat'
const BOTTOM_TEXT = 'goblok banget'
const BLUR = 0

const COLOR_OUTER = '#dadada'
const COLOR_MID = '#000000'
const BG_COLOR = '#ffffff'

const FONT_URL = 'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/Font/ARIALN.ttf'
const EMOJI_JSON_URL = 'https://media.githubusercontent.com/media/Ditzzx-vibecoder/entahlah/main/emoji-apple.json'
const FONT_PATH = path.join(__dirname, 'ARIALN.ttf')
const EMOJI_JSON_PATH = path.join(__dirname, 'emoji-apple.json')

async function downloadFile(url, dest) {
  const res = await fetch(url)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(dest, buf)
  return buf
}

async function ensureFont() {
  if (!existsSync(FONT_PATH)) await downloadFile(FONT_URL, FONT_PATH)
  GlobalFonts.registerFromPath(FONT_PATH, 'ArialNarrow')
}

let emojiMap = null
const emojiImageCache = new Map()

function emojiToUnicode(emoji) {
  return [...emoji].map(c => c.codePointAt(0).toString(16).padStart(4, '0')).join('-')
}

async function loadEmojiMap() {
  if (emojiMap) return emojiMap
  if (!existsSync(EMOJI_JSON_PATH)) await downloadFile(EMOJI_JSON_URL, EMOJI_JSON_PATH)
  emojiMap = JSON.parse(readFileSync(EMOJI_JSON_PATH, 'utf-8'))
  return emojiMap
}

async function getEmojiImage(emoji) {
  if (emojiImageCache.has(emoji)) return emojiImageCache.get(emoji)
  const map = await loadEmojiMap()
  const base = emojiToUnicode(emoji)
  const variants = [
    base,
    base.replace(/-fe0f/gi, ''),
    `${base.replace(/-fe0f/gi, '')}-fe0f`,
    base.toUpperCase(),
    base.replace(/-fe0f/gi, '').toUpperCase(),
    base.replace(/-fe0f/gi, '').toUpperCase() + '-FE0F'
  ]
  let b64 = null
  for (const v of variants) {
    if (map[v]) { b64 = map[v]; break }
  }
  if (!b64) return null
  const img = await loadImage(Buffer.from(b64, 'base64'))
  emojiImageCache.set(emoji, img)
  return img
}

async function drawAppleEmoji(ctx, emoji, x, y, size) {
  const img = await getEmojiImage(emoji)
  if (!img) { ctx.fillText(emoji, x, y); return }
  ctx.drawImage(img, x, y, size, size)
}

const EMOJI_REGEX = /(\p{Emoji_Modifier_Base}\p{Emoji_Modifier}|\p{Emoji_Presentation}\uFE0F?|\p{Emoji}\uFE0F|[\u{1F1E0}-\u{1F1FF}]{2}|\p{Extended_Pictographic}\uFE0F?)/gu

function measureTextCustom(ctx, text, fontSize) {
  const parts = text.split(EMOJI_REGEX)
  let w = 0
  for (const part of parts) {
    if (!part) continue
    EMOJI_REGEX.lastIndex = 0
    if (EMOJI_REGEX.test(part)) w += fontSize
    else w += ctx.measureText(part).width
    EMOJI_REGEX.lastIndex = 0
  }
  return w
}

async function drawCenteredLineWithEmojis(ctx, text, centerX, y, fontSize) {
  const totalW = measureTextCustom(ctx, text, fontSize)
  let curX = centerX - totalW / 2
  const parts = text.split(EMOJI_REGEX)
  for (const part of parts) {
    if (!part) continue
    EMOJI_REGEX.lastIndex = 0
    if (EMOJI_REGEX.test(part)) {
      await drawAppleEmoji(ctx, part, curX, y, fontSize)
      curX += fontSize
    } else {
      ctx.fillText(part, curX, y)
      curX += ctx.measureText(part).width
    }
    EMOJI_REGEX.lastIndex = 0
  }
}

function wrapText(ctx, text, maxWidth, fontSize) {
  ctx.font = `${fontSize}px ArialNarrow`
  const words = text.split(' ')
  const lines = []
  let cur = ''
  for (const word of words) {
    const test = cur ? cur + ' ' + word : word
    if (measureTextCustom(ctx, test, fontSize) > maxWidth && cur) {
      lines.push(cur)
      cur = word
    } else {
      cur = test
    }
  }
  if (cur) lines.push(cur)
  return lines
}

function fitFontSize(ctx, text, maxWidth, maxHeight, lineGap, startSize) {
  let size = startSize
  while (size > 4) {
    ctx.font = `${size}px ArialNarrow`
    const lines = wrapText(ctx, text, maxWidth, size)
    const longestWord = Math.max(...text.split(' ').map(w => measureTextCustom(ctx, w, size)))
    const totalHeight = lines.length * (size + lineGap) - lineGap
    if (longestWord <= maxWidth && totalHeight <= maxHeight) {
      return { size, lines }
    }
    size -= 2
  }
  const lines = wrapText(ctx, text, maxWidth, size)
  return { size, lines }
}

async function generateBrat3({
  topText = TOP_TEXT,
  midText = MID_TEXT,
  bottomText = BOTTOM_TEXT,
  blur = BLUR
} = {}) {
  const blurAmount = [0, 1, 2, 3].includes(blur) ? blur : 0

  const size = 1000
  const padding = 40
  const lineGap = 6
  const stackGapTop = 4
  const stackGapBottom = 40
  const maxWidth = size - padding * 2
  const maxHeight = size - padding * 2

  const OUTER_START_SIZE = 200
  const MID_START_SIZE = 340

  await ensureFont()
  await loadEmojiMap()

  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = BG_COLOR
  ctx.fillRect(0, 0, size, size)

  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  const centerX = size / 2

  function computeLayout(outerSize, midSize) {
    ctx.font = `${outerSize}px ArialNarrow`
    const topLines = wrapText(ctx, topText, maxWidth, outerSize)
    const bottomLines = wrapText(ctx, bottomText, maxWidth, outerSize)
    const topLongest = Math.max(...topText.split(' ').map(w => measureTextCustom(ctx, w, outerSize)))
    const bottomLongest = Math.max(...bottomText.split(' ').map(w => measureTextCustom(ctx, w, outerSize)))

    ctx.font = `${midSize}px ArialNarrow`
    const midLines = wrapText(ctx, midText, maxWidth, midSize)
    const midLongest = Math.max(...midText.split(' ').map(w => measureTextCustom(ctx, w, midSize)))

    const topH = topLines.length * (outerSize + lineGap) - lineGap
    const midH = midLines.length * (midSize + lineGap) - lineGap
    const bottomH = bottomLines.length * (outerSize + lineGap) - lineGap
    const totalH = topH + stackGapTop + midH + stackGapBottom + bottomH

    const fits = topLongest <= maxWidth && bottomLongest <= maxWidth && midLongest <= maxWidth && totalH <= maxHeight
    return { fits, topLines, midLines, bottomLines, topH, midH, bottomH, totalH }
  }

  let outerSize = OUTER_START_SIZE
  let midSize = MID_START_SIZE
  let layout = computeLayout(outerSize, midSize)
  while (!layout.fits && outerSize > 6) {
    outerSize -= 2
    midSize -= Math.round(2 * (MID_START_SIZE / OUTER_START_SIZE))
    layout = computeLayout(outerSize, midSize)
  }

  const { topLines, midLines, bottomLines, topH, midH, bottomH, totalH } = layout

  ctx.save()
  if (blurAmount > 0) ctx.filter = `blur(${blurAmount}px)`

  let cursorY = (size - totalH) / 2

  ctx.fillStyle = COLOR_OUTER
  ctx.font = `${outerSize}px ArialNarrow`
  {
    let y = cursorY
    for (const line of topLines) {
      await drawCenteredLineWithEmojis(ctx, line, centerX, y, outerSize)
      y += outerSize + lineGap
    }
    cursorY += topH + stackGapTop
  }

  ctx.fillStyle = COLOR_MID
  ctx.font = `${midSize}px ArialNarrow`
  {
    let y = cursorY
    for (const line of midLines) {
      await drawCenteredLineWithEmojis(ctx, line, centerX, y, midSize)
      y += midSize + lineGap
    }
    cursorY += midH + stackGapBottom
  }

  ctx.fillStyle = COLOR_OUTER
  ctx.font = `${outerSize}px ArialNarrow`
  {
    let y = cursorY
    for (const line of bottomLines) {
      await drawCenteredLineWithEmojis(ctx, line, centerX, y, outerSize)
      y += outerSize + lineGap
    }
  }

  ctx.restore()

  const buffer = await canvas.encode('png')
  const outPath = path.join(process.cwd(), `brat3-${Date.now()}.png`)
  writeFileSync(outPath, buffer)
  return outPath
}

module.exports = { generateBrat3 }

if (require.main === module) {
  generateBrat3()
    .then(outPath => console.log(outPath))
    .catch(err => console.error(err))
}
