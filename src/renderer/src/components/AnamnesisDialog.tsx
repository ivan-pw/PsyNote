/**
 * src/renderer/src/components/AnamnesisDialog.tsx
 *
 * Структурированная форма анамнеза.
 *
 * Открывается в двух режимах:
 *   - create: пустая форма, taken_on по умолчанию = сегодня;
 *   - edit:   подгружаем существующий анамнез через useAnamnesis(id) и
 *             даём «Сохранить» / «Удалить» (с вводом подтверждающего слова).
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDestructiveDialog } from './ConfirmDestructiveDialog'
import { Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  useAnamnesis,
  useCreateAnamnesis,
  useDeleteAnamnesis,
  useUpdateAnamnesis
} from '@/hooks/useAnamneses'
import { ANAMNESIS_FIELDS, todayIsoDate, type AnamnesisFieldKey } from '@/lib/anamnesis'
import type { AnamnesisInput } from '@shared/types'

type Props = {
  open: boolean
  clientId: number
  anamnesisId: number | null // null = создание
  onClose: () => void
}

type FormState = { taken_on: string } & Record<AnamnesisFieldKey, string>

function emptyForm(): FormState {
  return {
    taken_on: todayIsoDate(),
    complaints: '',
    life_history: '',
    family_history: '',
    medical_history: '',
    mental_history: '',
    substances: '',
    notes: ''
  }
}

export function AnamnesisDialog({ open, clientId, anamnesisId, onClose }: Props) {
  const { t } = useTranslation()
  const isEdit = anamnesisId !== null
  const { data: existing, isLoading } = useAnamnesis(isEdit ? anamnesisId : null)
  const create = useCreateAnamnesis(clientId)
  const update = useUpdateAnamnesis(clientId, anamnesisId ?? 0)
  const remove = useDeleteAnamnesis(clientId)

  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // При открытии/смене id перезаливаем форму: либо данные с сервера, либо пусто.
  useEffect(() => {
    if (!open) return
    if (isEdit && existing) {
      setForm({
        taken_on: existing.taken_on,
        complaints: existing.complaints ?? '',
        life_history: existing.life_history ?? '',
        family_history: existing.family_history ?? '',
        medical_history: existing.medical_history ?? '',
        mental_history: existing.mental_history ?? '',
        substances: existing.substances ?? '',
        notes: existing.notes ?? ''
      })
    }
    if (!isEdit) setForm(emptyForm())
    setError(null)
  }, [open, isEdit, existing])

  function buildInput(): AnamnesisInput {
    return {
      taken_on: form.taken_on,
      complaints: form.complaints.trim() || null,
      life_history: form.life_history.trim() || null,
      family_history: form.family_history.trim() || null,
      medical_history: form.medical_history.trim() || null,
      mental_history: form.mental_history.trim() || null,
      substances: form.substances.trim() || null,
      notes: form.notes.trim() || null
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.taken_on)) {
      setError(t('anamnesis.date_required'))
      return
    }
    try {
      if (isEdit && anamnesisId) {
        await update.mutateAsync(buildInput())
      } else {
        await create.mutateAsync(buildInput())
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function doDelete() {
    if (!isEdit || anamnesisId === null) return
    try {
      await remove.mutateAsync(anamnesisId)
      setConfirmDelete(false)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const busy = create.isPending || update.isPending || remove.isPending

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {/* max-h + overflow: 7 текстовых полей не помещаются на небольших экранах,
          поэтому контент диалога прокручивается, а не вылезает за экран. */}
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('anamnesis.title') : t('anamnesis.new')}</DialogTitle>
          <DialogDescription>{t('anamnesis.description')}</DialogDescription>
        </DialogHeader>

        {isEdit && isLoading ? (
          <p className="py-6 text-sm text-muted-foreground">{t('app.loading')}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="taken_on">{t('anamnesis.date')}</Label>
                <Input
                  id="taken_on"
                  type="date"
                  required
                  value={form.taken_on}
                  onChange={(e) => setForm((f) => ({ ...f, taken_on: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {ANAMNESIS_FIELDS.map(({ key, label }) => (
                <div key={key} className="col-span-2 space-y-1">
                  <Label htmlFor={key}>{t(label)}</Label>
                  <Textarea
                    id={key}
                    rows={3}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
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
        )}
      </DialogContent>
    </Dialog>

    <ConfirmDestructiveDialog
      open={confirmDelete}
      itemLabel={t('anamnesis.delete_confirm')}
      busy={remove.isPending}
      onCancel={() => setConfirmDelete(false)}
      onConfirm={doDelete}
    />
    </>
  )
}
