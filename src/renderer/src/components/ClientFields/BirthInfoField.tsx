/**
 * src/renderer/src/components/ClientFields/BirthInfoField.tsx
 *
 * Строка «Возраст» в панели «Информация о клиенте».
 *
 * Психолог часто знает только возраст, а не дату рождения, поэтому
 * редактор предлагает оба варианта: точную дату ИЛИ количество лет.
 * Возраст хранится как год рождения (clients.birth_year), чтобы значение
 * не устаревало; при отображении пересчитывается обратно в годы (≈).
 */
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cake, Check, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { useUpdateClientProfile } from '@/hooks/useClients'
import { ageToBirthYear, clientAge, formatAge } from '@/lib/age'
import { formatDate } from '@/lib/format'
import type { Client } from '@shared/types'

type Props = {
  client: Client
  /** Открыть сразу в режиме редактирования (для «+ Добавить поле»). */
  defaultEditing?: boolean
  onDismissEmpty?: () => void
}

export function BirthInfoField({ client, defaultEditing = false, onDismissEmpty }: Props) {
  const { t } = useTranslation()
  const update = useUpdateClientProfile(client.id)
  const [editing, setEditing] = useState(defaultEditing)
  const [date, setDate] = useState(client.birth_date ?? '')
  const [age, setAge] = useState('')
  const [error, setError] = useState<string | null>(null)
  const dateRef = useRef<HTMLInputElement | null>(null)

  const current = clientAge(client.birth_date, client.birth_year)

  useEffect(() => {
    if (!editing) {
      setDate(client.birth_date ?? '')
      setAge(current && current.approximate ? String(current.years) : '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.birth_date, client.birth_year, editing])

  useEffect(() => {
    if (editing) dateRef.current?.focus()
  }, [editing])

  async function save() {
    setError(null)
    const ageNum = age.trim() === '' ? null : Number(age.trim())
    if (ageNum !== null && (!Number.isInteger(ageNum) || ageNum < 0 || ageNum > 120)) {
      setError(t('client.age_validation'))
      return
    }
    try {
      // zod-схема профиля обнуляет непереданные поля (birth_date/birth_year/
      // notes_short), поэтому передаём все три явно.
      await update.mutateAsync({
        birth_date: date || null,
        birth_year: !date && ageNum !== null ? ageToBirthYear(ageNum) : null,
        notes_short: client.notes_short
      })
      setEditing(false)
      if (!date && ageNum === null) onDismissEmpty?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function cancel() {
    setDate(client.birth_date ?? '')
    setAge(current && current.approximate ? String(current.years) : '')
    setEditing(false)
    setError(null)
    if (!current) onDismissEmpty?.()
  }

  return (
    <div className="group flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/30">
      <Cake className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{t('client.age')}</div>
        {editing ? (
          <div className="mt-1 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="mb-0.5 text-[11px] text-muted-foreground">{t('client.birth_date')}</div>
                <Input
                  ref={dateRef}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && cancel()}
                />
              </div>
              <div>
                <div className="mb-0.5 text-[11px] text-muted-foreground">{t('client.or_years')}</div>
                <Input
                  type="number"
                  min={0}
                  max={120}
                  placeholder="34"
                  value={age}
                  disabled={Boolean(date)}
                  onChange={(e) => setAge(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') cancel()
                    if (e.key === 'Enter') void save()
                  }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => void save()} disabled={update.isPending}>
                <Check className="size-4" />
                {t('common.save')}
              </Button>
              <Button size="sm" variant="outline" onClick={cancel}>
                <X className="size-4" />
                {t('common.cancel')}
              </Button>
              {error && <span className="text-xs text-destructive">{error}</span>}
            </div>
          </div>
        ) : (
          <div className="mt-0.5 flex min-h-6 items-center gap-2 text-sm">
            {current ? (
              <span>
                {formatAge(current.years, current.approximate)}
                {client.birth_date && (
                  <span className="text-muted-foreground"> · {t('client.born', { date: formatDate(client.birth_date) })}</span>
                )}
              </span>
            ) : (
              <span className="italic text-muted-foreground">—</span>
            )}
          </div>
        )}
      </div>

      {!editing && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('client.edit_age')}
                className="size-7 text-muted-foreground"
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('common.edit')}</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  )
}
