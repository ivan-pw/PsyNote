/**
 * src/renderer/src/components/MeetingProtocolDialog.tsx
 *
 * Структурированный протокол встречи. 1:1 c meeting (UNIQUE meeting_id),
 * поэтому единственный flow — upsert: создаст или обновит существующий.
 *
 * Удаление — через ConfirmDestructiveDialog (требует ввод слова «удалить»).
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/sonner'
import {
  useDeleteProtocol,
  useProtocolByMeeting,
  useUpsertProtocol
} from '@/hooks/useMeetingProtocols'
import { PROTOCOL_FIELDS, type ProtocolFieldKey } from '@/lib/meetingProtocol'
import type { MeetingProtocolInput } from '@shared/types'
import { ConfirmDestructiveDialog } from './ConfirmDestructiveDialog'

type Props = {
  open: boolean
  meetingId: number
  clientId: number
  onClose: () => void
}

type FormState = Record<ProtocolFieldKey, string>

const emptyForm: FormState = {
  summary: '',
  techniques: '',
  client_state: '',
  homework: '',
  plan_next: '',
  private_notes: ''
}

export function MeetingProtocolDialog({ open, meetingId, clientId, onClose }: Props) {
  const { t } = useTranslation()
  const { data: existing, isLoading } = useProtocolByMeeting(open ? meetingId : null)
  const upsert = useUpsertProtocol(meetingId, clientId)
  const remove = useDeleteProtocol(meetingId, clientId)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (existing) {
      setForm({
        summary: existing.summary ?? '',
        techniques: existing.techniques ?? '',
        client_state: existing.client_state ?? '',
        homework: existing.homework ?? '',
        plan_next: existing.plan_next ?? '',
        private_notes: existing.private_notes ?? ''
      })
    } else {
      setForm(emptyForm)
    }
  }, [open, existing])

  function buildInput(): MeetingProtocolInput {
    return {
      summary: form.summary.trim() || null,
      techniques: form.techniques.trim() || null,
      client_state: form.client_state.trim() || null,
      homework: form.homework.trim() || null,
      plan_next: form.plan_next.trim() || null,
      private_notes: form.private_notes.trim() || null
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const input = buildInput()
    const allEmpty = Object.values(input).every((v) => !v)
    if (allEmpty) {
      setError(t('protocol.error_empty'))
      return
    }
    try {
      await upsert.mutateAsync(input)
      toast.success(existing ? t('protocol.updated') : t('protocol.saved'))
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function doDelete() {
    if (!existing) return
    try {
      await remove.mutateAsync(existing.id)
      toast.success(t('protocol.deleted'))
      setConfirmDelete(false)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const busy = upsert.isPending || remove.isPending

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {existing ? t('protocol.title') : t('protocol.new')}
            </DialogTitle>
            <DialogDescription>{t('protocol.description')}</DialogDescription>
          </DialogHeader>

          {isLoading && open ? (
            <p className="py-6 text-sm text-muted-foreground">{t('app.loading')}</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {PROTOCOL_FIELDS.map(({ key, label, placeholder }) => (
                  <div key={key} className="space-y-1">
                    <Label htmlFor={`protocol-${key}`}>{t(label)}</Label>
                    <Textarea
                      id={`protocol-${key}`}
                      rows={3}
                      placeholder={t(placeholder)}
                      value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <DialogFooter className="gap-2 sm:gap-2">
                {existing && (
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={busy}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? '…' : existing ? t('common.save') : t('common.create')}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDestructiveDialog
        open={confirmDelete}
        itemLabel={t('protocol.delete_confirm')}
        busy={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={doDelete}
      />
    </>
  )
}
