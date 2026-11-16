export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function checkDigit(digits: string, length: number): number {
  let sum = 0
  for (let i = 0; i < length; i++) sum += Number(digits[i]) * (length + 1 - i)
  const rest = (sum * 10) % 11
  return rest === 10 ? 0 : rest
}

export function isValidCpf(digits: string): boolean {
  if (!/^\d{11}$/.test(digits)) return false
  if (/^(\d)\1{10}$/.test(digits)) return false
  return checkDigit(digits, 9) === Number(digits[9]) && checkDigit(digits, 10) === Number(digits[10])
}

export function formatCpf(digits: string): string {
  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
}
