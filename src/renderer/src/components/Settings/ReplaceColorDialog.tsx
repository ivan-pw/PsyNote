/**
 * src/renderer/src/components/Settings/ReplaceColorDialog.tsx
 *
 * Когда пользователь пытается удалить цвет, уже использующийся в заметках,
 * предлагаем ему выбрать, на что заменить (или «убрать цвет» — toId=null).
 * Транзакцию делает main: replaceAndDeleteColor.
 *
 * При выборе цвета фильтруем удаляемый — нельзя заменить на самого себя.
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useDeleteColor } from '@/hooks/useColors'
import type { NoteColor } from '@shared/types'

type Props = {
  open: boolean
  target: NoteColor | null
  others: NoteColor[]
  usageCount: number
  onClose: () => void
}

export function ReplaceColorDialog({ open, target, others, usageCount, onClose }: Props) {
  const { t } = useTranslation()
  const remove = useDeleteColor()
  const NONE = '__none__'
  const [toId, setToId] = useState<string>(NONE)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setToId(others[0] ? String(others[0].id) : NONE)
  }, [open, others])

  if (!target) return null

  async function handleSubmit() {
    if (!target) return
    setError(null)
    try {
      await remove.mutateAsync({
        fromId: target.id,
        toId: toId === NONE ? null : Number(toId)
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('colors.replace_title', { label: target.label })}</DialogTitle>
          <DialogDescription>
            {t('colors.replace_description', { count: usageCount })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="to-color">{t('colors.replace_with')}</Label>
          <Select value={toId} onValueChange={setToId}>
            <SelectTrigger id="to-color">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>
                <span className="text-muted-foreground">{t('notes.no_color')}</span>
              </SelectItem>
              {others.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block size-3 rounded-sm"
                      style={{ backgroundColor: c.hex }}
                    />
                    {c.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={remove.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={remove.isPending}
          >
            {remove.isPending ? '…' : t('colors.replace_and_delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
