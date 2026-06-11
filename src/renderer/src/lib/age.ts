/**
 * src/renderer/src/lib/age.ts
 *
 * Возраст клиента: точный — из birth_date, приблизительный — из birth_year
 * (используется, когда психолог знает только «сколько лет», без даты).
 */
import { differenceInYears, parseISO } from 'date-fns'

/** Возраст в годах или null, если ничего не известно. */
export function clientAge(
  birthDate: string | null,
  birthYear: number | null
): { years: number; approximate: boolean } | null {
  if (birthDate) {
    return { years: differenceInYears(new Date(), parseISO(birthDate)), approximate: false }
  }
  if (birthYear) {
    return { years: new Date().getFullYear() - birthYear, approximate: true }
  }
  return null
}

/** «34 года», «≈35 лет» — с правильным склонением. */
export function formatAge(years: number, approximate = false): string {
  return `${approximate ? '≈' : ''}${years} ${pluralYears(years)}`
}

export function pluralYears(n: number): string {
  const abs = Math.abs(n) % 100
  const d = abs % 10
  if (abs > 10 && abs < 20) return 'лет'
  if (d === 1) return 'год'
  if (d >= 2 && d <= 4) return 'года'
  return 'лет'
}

/** Возраст → год рождения (для сохранения в birth_year). */
export function ageToBirthYear(age: number): number {
  return new Date().getFullYear() - age
}
