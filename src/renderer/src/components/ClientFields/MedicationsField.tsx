/**
 * src/renderer/src/components/ClientFields/MedicationsField.tsx
 *
 * Multi-select поле «Медикаменты» с автодополнением из пресетов.
 *
 * Хранение в БД (см. lib/medications): JSON-массив строк в одной TEXT-колонке.
 * Любая правка (включая «очистить») создаёт ревизию через useUpdateClientField,
 * как и у обычных историзируемых полей.
 *
 * UX:
 *  - display: список chip'ов, hover показывает ✎ + ⏱ (история).
 *  - edit:
 *      * текущие значения как chip'ы с × для удаления;
 *      * input + выпадающие подсказки (пресеты, отфильтрованные по подстроке);
 *      * Enter добавляет первую подсказку или, если подсказок нет, кастомное
 *        значение из input. Дубликаты отсекаются;
 *      * клик по подсказке добавляет её.
 *  - сохранение по «Сохранить»; Esc — отмена; Cmd/Ctrl+Enter — сохранить.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Pencil, Pill, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { useUpdateClientField } from '@/hooks/useClients'
import { useMedicationPresets } from '@/hooks/useMedicationPresets'
import { parseMedications, stringifyMedications } from '@/lib/medications'
import { cn } from '@/lib/utils'
import { RevisionHistoryPopover } from './RevisionHistoryPopover'

type Props = {
  clientId: number
  value: string | null
}

export function MedicationsField({ clientId, value }: Props) {
  const { t } = useTranslation()
  const update = useUpdateClientField(clientId)
  const { data: presets } = useMedicationPresets()
  const [editing, setEditing] = useState(false)
  const [items, setItems] = useState<string[]>(() => parseMedications(value))
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Перезаливаем из value при изменении (после mutate).
  useEffect(() => {
    if (!editing) setItems(parseMedications(value))
  }, [value, editing])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const suggestions = useMemo(() => {
    const all = (presets ?? []).map((p) => p.name)
    const taken = new Set(items.map((x) => x.toLowerCase()))
    const free = all.filter((n) => !taken.has(n.toLowerCase()))
    const q = input.trim().toLowerCase()
    if (!q) return free.slice(0, 8)
    return free.filter((n) => n.toLowerCase().includes(q)).slice(0, 8)
  }, [presets, items, input])

  function addValue(v: string) {
    const t = v.trim()
    if (!t) return
    setItems((prev) => {
      if (prev.some((x) => x.toLowerCase() === t.toLowerCase())) return prev
      return [...prev, t]
    })
    setInput('')
  }

  function removeAt(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  async function save() {
    setError(null)
    const next = stringifyMedications(items)
    const prev = stringifyMedications(parseMedications(value))
    if (next === prev) {
      setEditing(false)
      return
    }
    try {
      await update.mutateAsync({ field: 'medications', value: next })
      setEditing(false)
      setInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function cancel() {
    setItems(parseMedications(value))
    setInput('')
    setError(null)
    setEditing(false)
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      cancel()
      return
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      void save()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (suggestions[0] && input.trim()) {
        addValue(suggestions[0])
      } else if (input.trim()) {
        addValue(input)
      }
      return
    }
    if (e.key === 'Backspace' && input === '' && items.length > 0) {
      removeAt(items.length - 1)
    }
  }

  return (
    <div className="group flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/30">
      <Pill className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{t('fields.medications')}</div>

        {editing ? (
          <div className="mt-1 space-y-1.5">
            <div className="flex flex-wrap gap-1 rounded border bg-background p-1.5">
              {items.map((it, i) => (
                <Badge
                  key={`${it}-${i}`}
                  variant="secondary"
                  className="gap-1 pl-2 pr-1"
                >
                  {it}
                  <button
                    type="button"
                    aria-label={t('medications.remove', { value: it })}
                    onClick={() => removeAt(i)}
                    className="rounded hover:bg-destructive/20"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder={
                  items.length === 0
                    ? t('medications.start_typing')
                    : t('medications.one_more')
                }
                className="h-7 min-w-[140px] flex-1 border-0 bg-transparent px-1 focus-visible:ring-0"
              />
            </div>

            {/* Подсказки */}
            <div className="rounded border bg-popover">
              {suggestions.length === 0 && input.trim() && (
                <button
                  type="button"
                  onClick={() => addValue(input)}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <Plus className="size-3.5" />
                  {t('medications.add_custom', { value: input.trim() })}
                </button>
              )}
              {suggestions.length === 0 && !input.trim() && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  {t('medications.no_presets')}
                </div>
              )}
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addValue(s)}
                  className="flex w-full items-center gap-2 px-2 py-1 text-left text-sm hover:bg-accent"
                >
                  <Plus className="size-3.5 text-muted-foreground" />
                  {s}
                </button>
              ))}
              {input.trim() &&
                suggestions.length > 0 &&
                !suggestions.some(
                  (s) => s.toLowerCase() === input.trim().toLowerCase()
                ) && (
                  <button
                    type="button"
                    onClick={() => addValue(input)}
                    className="flex w-full items-center gap-2 border-t px-2 py-1 text-left text-sm hover:bg-accent"
                  >
                    <Plus className="size-3.5" />
                    {t('medications.add_custom', { value: input.trim() })}
                  </button>
                )}
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
          <div className="mt-0.5 flex min-h-6 items-center gap-1.5">
            {items.length === 0 ? (
              <span className="italic text-muted-foreground">—</span>
            ) : (
              items.map((it, i) => (
                <Badge key={`${it}-${i}`} variant="secondary">
                  {it}
                </Badge>
              ))
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
                aria-label={t('common.edit')}
                className="size-7 text-muted-foreground"
                onClick={() => setEditing(true)}
              >
                <Pencil className={cn('size-3.5')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('common.edit')}</TooltipContent>
          </Tooltip>
          <RevisionHistoryPopover clientId={clientId} field="medications" />
        </div>
      )}
    </div>
  )
}
