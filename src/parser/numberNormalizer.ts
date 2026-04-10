const digitWordPairs: Array<[string, string]> = [
  ['여덟', '8'],
  ['여섯', '6'],
  ['다섯', '5'],
  ['일곱', '7'],
  ['아홉', '9'],
  ['하나', '1'],
  ['셋', '3'],
  ['세', '3'],
  ['넷', '4'],
  ['네', '4'],
  ['둘', '2'],
  ['두', '2'],
  ['한', '1'],
  ['영', '0'],
  ['공', '0'],
  ['빵', '0'],
  ['일', '1'],
  ['이', '2'],
  ['삼', '3'],
  ['사', '4'],
  ['오', '5'],
  ['육', '6'],
  ['칠', '7'],
  ['팔', '8'],
  ['구', '9'],
]

const sinoDigitMap: Record<string, number> = {
  영: 0,
  공: 0,
  일: 1,
  이: 2,
  삼: 3,
  사: 4,
  오: 5,
  육: 6,
  칠: 7,
  팔: 8,
  구: 9,
}

const unitMap: Record<string, number> = {
  십: 10,
  백: 100,
  천: 1000,
}

const largeUnitMap: Record<string, number> = {
  만: 10000,
  억: 100000000,
}

function isNumericString(value: string): boolean {
  return /^[+-]?\d+(\.\d+)?$/.test(value)
}

function cleanNumberInput(value: string): string {
  return value.replace(/,/g, '').replace(/\s+/g, '')
}

function parseDigitSequence(input: string): string | null {
  if (!input) return null

  let index = 0
  let output = ''
  while (index < input.length) {
    const char = input[index]
    if (/\d/.test(char)) {
      output += char
      index += 1
      continue
    }

    let matched = false
    for (const [word, digit] of digitWordPairs) {
      if (input.startsWith(word, index)) {
        output += digit
        index += word.length
        matched = true
        break
      }
    }

    if (!matched) return null
  }

  return output
}

function parseSinoInteger(input: string): string | null {
  if (!input) return null

  let total = 0
  let section = 0
  let current = 0

  for (const char of input) {
    if (char in sinoDigitMap) {
      current = sinoDigitMap[char]
      continue
    }

    if (char in unitMap) {
      const unit = unitMap[char]
      section += (current === 0 ? 1 : current) * unit
      current = 0
      continue
    }

    if (char in largeUnitMap) {
      const largeUnit = largeUnitMap[char]
      section += current
      total += (section === 0 ? 1 : section) * largeUnit
      section = 0
      current = 0
      continue
    }

    return null
  }

  return String(total + section + current)
}

function parseIntegerPart(input: string): string | null {
  if (!input) return '0'
  if (/^\d+$/.test(input)) return input

  if (/[십백천만억]/.test(input)) {
    return parseSinoInteger(input)
  }
  return parseDigitSequence(input)
}

function parseFractionPart(input: string): string | null {
  if (!input) return null
  if (/^\d+$/.test(input)) return input
  return parseDigitSequence(input)
}

export function normalizeNumberText(valuePart: string): string | null {
  const trimmed = valuePart.trim()
  if (!trimmed) return null

  const cleaned = cleanNumberInput(trimmed)
  if (isNumericString(cleaned)) return cleaned

  let source = cleaned
  if (/[가-힣]/.test(source) && source.includes('.')) {
    source = source.replace('.', '점')
  }

  const pointTokens = source.split('점')
  if (pointTokens.length > 2) return null

  const integerPart = parseIntegerPart(pointTokens[0] ?? '')
  if (!integerPart) return null

  if (pointTokens.length === 1) {
    return integerPart
  }

  const fractionRaw = pointTokens[1] ?? ''
  const fractionPart = parseFractionPart(fractionRaw)
  if (!fractionPart) return null

  return `${integerPart}.${fractionPart}`
}

export function detectNumberValueType(valueText: string): 'integer' | 'float' {
  return valueText.includes('.') ? 'float' : 'integer'
}
