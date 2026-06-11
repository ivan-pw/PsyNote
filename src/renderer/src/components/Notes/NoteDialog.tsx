/**
 * src/renderer/src/components/Notes/NoteDialog.tsx
 *
 * Диалог создания/редактирования заметки.
 * Поля: цвет (Select из палитры, с превью), тело (Textarea).
 *
 * Удаление — через ConfirmDestructiveDialog (ввод слова «удалить»/«delete»).
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  useCreateNote,
  useDeleteNote,
  useUpdateNote
} from '@/hooks/useNotes'
import { useColors } from '@/hooks/useColors'
import { ConfirmDestructiveDialog } from '../ConfirmDestructiveDialog'
import type { Note } from '@shared/types'

export type NoteDialogState =
  | { mode: 'create' }
  | { mode: 'edit'; note: Note }

type Props = {
  open: boolean
  clientId: number
  state: NoteDialogState | null
  onClose: () => void
}

export function NoteDialog({ open, clientId, state, onClose }: Props) {
  const { t } = useTranslation()
  const { data: colors } = useColors()
  const create = useCreateNote(clientId)
  const update = useUpdateNote(clientId)
  const remove = useDeleteNote(clientId)

  const [body, setBody] = useState('')
  const [colorId, setColorId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open || !state) return
    setError(null)
    if (state.mode === 'edit') {
      setBody(state.note.body)
      setColorId(state.note.color_id)
    } else {
      setBody('')
      setColorId(colors?.[0]?.id ?? null)
    }
  }, [open, state, colors])

  if (!state) return null
  const isEdit = state.mode === 'edit'
  const busy = create.isPending || update.isPending || remove.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!state) return
    setError(null)
    if (!body.trim()) {
      setError(t('notes.body_required'))
      return
    }
    try {
      if (state.mode === 'edit') {
        await update.mutateAsync({
          id: state.note.id,
          patch: { color_id: colorId, body: body.trim() }
        })
      } else {
        await create.mutateAsync({ color_id: colorId, body: body.trim() })
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function doDelete() {
    if (!state || state.mode !== 'edit') return
    try {
      await remove.mutateAsync(state.note.id)
      setConfirmDelete(false)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const NO_COLOR = '__none__'

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t('notes.note') : t('notes.new_note')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="color">{t('notes.color')}</Label>
            <Select
              value={colorId === null ? NO_COLOR : String(colorId)}
              onValueChange={(v) => setColorId(v === NO_COLOR ? null : Number(v))}
            >
              <SelectTrigger id="color">
                <SelectValue placeholder={t('notes.no_color')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_COLOR}>
                  <span className="text-muted-foreground">{t('notes.no_color')}</span>
                </SelectItem>
                {(colors ?? []).map((c) => (
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

          <div className="space-y-1">
            <Label htmlFor="body">{t('notes.body')}</Label>
            <Textarea
              id="body"
              rows={6}
              autoFocus
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  void handleSubmit(e as unknown as React.FormEvent)
                }
              }}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="gap-2 sm:gap-2">
            {isEdit && (
              <Button
                type="button"
                variant="ghost"
                className="mr-auto text-destructive hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
              >
                <Trash2 className="size-4" />
                {t('common.delete')}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? '…' : isEdit ? t('common.save') : t('common.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <ConfirmDestructiveDialog
      open={confirmDelete}
      itemLabel={t('notes.delete_confirm')}
      busy={remove.isPending}
      onCancel={() => setConfirmDelete(false)}
      onConfirm={doDelete}
    />
    </>
  )
}
