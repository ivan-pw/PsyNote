/**
 * src/renderer/src/components/MeetingDialog.tsx
 *
 * Универсальный диалог встречи — create и edit. Поля:
 *   - клиент (Select со списком клиентов);
 *   - дата + время начала и окончания (datetime-local);
 *   - статус (planned / done / cancelled);
 *   - комментарий.
 *
 * Кнопка «Открыть клиента» — навигация в карточку (plan §6.4).
 * Удаление — с подтверждением.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ExternalLink, FileEdit, Trash2 } from 'lucide-react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  useCreateMeeting,
  useDeleteMeeting,
  useUpdateMeeting
} from '@/hooks/useMeetings'
import { useClients } from '@/hooks/useClients'
import {
  DEFAULT_SESSION_MINUTES,
  addMinutes,
  inputToIso,
  isoToLocalInput,
  localDateTimeInput,
  roundUpToHour
} from '@/lib/meetings'
import { MEETING_STATUSES, type Meeting, type MeetingStatus } from '@shared/types'
import { ConfirmDestructiveDialog } from './ConfirmDestructiveDialog'
import { MeetingProtocolDialog } from './MeetingProtocolDialog'

export type MeetingDialogState =
  | { mode: 'create'; preset?: { start?: Date; clientId?: number } }
  | { mode: 'edit'; meeting: Meeting }

type Props = {
  open: boolean
  state: MeetingDialogState | null
  onClose: () => void
  /**
   * Показывать ли кнопку «Открыть клиента» в режиме edit.
   * Если диалог открыт со страницы конкретного клиента — кнопка не имеет
   * смысла и её скрывают (передают false). По умолчанию (например, из
   * календаря) кнопка показана.
   */
  showOpenClient?: boolean
}

type FormState = {
  client_id: number | null
  starts_at: string // datetime-local
  ends_at: string
  status: MeetingStatus
  comment: string
}

function defaultForm(preset?: { start?: Date; clientId?: number }): FormState {
  const start = preset?.start ? roundUpToHour(preset.start) : roundUpToHour(new Date())
  return {
    client_id: preset?.clientId ?? null,
    starts_at: localDateTimeInput(start),
    ends_at: localDateTimeInput(addMinutes(start, DEFAULT_SESSION_MINUTES)),
    status: 'planned',
    comment: ''
  }
}

function meetingToForm(m: Meeting): FormState {
  return {
    client_id: m.client_id,
    starts_at: isoToLocalInput(m.starts_at),
    ends_at: isoToLocalInput(m.ends_at),
    status: m.status,
    comment: m.comment ?? ''
  }
}

export function MeetingDialog({ open, state, onClose, showOpenClient = true }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: clients } = useClients({ includeArchived: false })
  const create = useCreateMeeting()
  const update = useUpdateMeeting()
  const remove = useDeleteMeeting()
  const [form, setForm] = useState<FormState>(() => defaultForm())
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // После сохранения новой встречи предложим заполнить протокол сразу.
  const [protocolForMeeting, setProtocolForMeeting] = useState<Meeting | null>(null)

  // Перезаливаем форму при открытии или смене переданного state.
  useEffect(() => {
    if (!open || !state) return
    setError(null)
    if (state.mode === 'create') setForm(defaultForm(state.preset))
    else setForm(meetingToForm(state.meeting))
  }, [open, state])

  if (!state) return null
  const isEdit = state.mode === 'edit'
  const busy = create.isPending || update.isPending || remove.isPending

  /**
   * Общая submit-логика. `andOpenProtocol=true` сразу после save (в create-режиме)
   * открывает диалог протокола — это поведение второй кнопки «Создать + протокол».
   */
  async function submit(andOpenProtocol: boolean) {
    if (!state) return
    setError(null)
    if (!form.client_id) {
      setError(t('meeting.select_client'))
      return
    }
    if (!form.starts_at || !form.ends_at) {
      setError(t('meeting.error_no_time'))
      return
    }
    if (new Date(form.ends_at) <= new Date(form.starts_at)) {
      setError(t('meeting.error_order'))
      return
    }
    try {
      if (state.mode === 'edit') {
        await update.mutateAsync({
          id: state.meeting.id,
          patch: {
            starts_at: inputToIso(form.starts_at),
            ends_at: inputToIso(form.ends_at),
            status: form.status,
            comment: form.comment.trim() || null
          }
        })
        onClose()
      } else {
        const created = await create.mutateAsync({
          client_id: form.client_id,
          starts_at: inputToIso(form.starts_at),
          ends_at: inputToIso(form.ends_at),
          status: form.status,
          comment: form.comment.trim() || null
        })
        if (andOpenProtocol) {
          // Не вызываем onClose сразу: иначе родитель снимет state=null и наш
          // компонент уйдёт в early-return до того, как успеет отрисовать
          // MeetingProtocolDialog. Покажем протокол поверх основного диалога;
          // закрытие протокола закроет и сам диалог встречи (см. onClose ниже).
          setProtocolForMeeting(created)
        } else {
          onClose()
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void submit(false)
  }

  async function doDelete() {
    if (!state || state.mode !== 'edit') return
    try {
      await remove.mutateAsync({ id: state.meeting.id, clientId: state.meeting.client_id })
      setConfirmDelete(false)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t('meeting.title') : t('meeting.new')}</DialogTitle>
          <DialogDescription>
            {t('meeting.description', { minutes: DEFAULT_SESSION_MINUTES })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="client">{t('meeting.client')}</Label>
            <Select
              value={form.client_id ? String(form.client_id) : undefined}
              onValueChange={(v) => setForm((f) => ({ ...f, client_id: Number(v) }))}
              disabled={isEdit /* в edit клиента не меняем */}
            >
              <SelectTrigger id="client">
                <SelectValue placeholder={t('meeting.select_client')} />
              </SelectTrigger>
              <SelectContent>
                {(clients ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="starts_at">{t('meeting.starts')}</Label>
              <Input
                id="starts_at"
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => {
                  const next = e.target.value
                  setForm((f) => {
                    // При изменении начала сдвигаем конец на ту же дельту, чтобы
                    // сохранить длительность. Если пользователь после этого
                    // отредактирует конец вручную — поле не блокируется и его
                    // значение возьмёт верх.
                    if (!next) return { ...f, starts_at: next }
                    const prevStart = new Date(f.starts_at)
                    const prevEnd = new Date(f.ends_at)
                    const newStart = new Date(next)
                    const canShift =
                      !Number.isNaN(prevStart.getTime()) &&
                      !Number.isNaN(prevEnd.getTime()) &&
                      !Number.isNaN(newStart.getTime()) &&
                      prevEnd > prevStart
                    if (!canShift) return { ...f, starts_at: next }
                    const duration = prevEnd.getTime() - prevStart.getTime()
                    const newEnd = new Date(newStart.getTime() + duration)
                    return {
                      ...f,
                      starts_at: next,
                      ends_at: localDateTimeInput(newEnd)
                    }
                  })
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ends_at">{t('meeting.ends')}</Label>
              <Input
                id="ends_at"
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="status">{t('meeting.status_label')}</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((f) => ({ ...f, status: v as MeetingStatus }))}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEETING_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`meeting.status.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="comment">{t('meeting.comment')}</Label>
            <Textarea
              id="comment"
              rows={3}
              value={form.comment}
              onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {/*
            flex-wrap нужен потому что в режиме edit footer держит до 5 кнопок
            (Удалить, Протокол, Открыть клиента, Отмена, Сохранить) — в стандартной
            ширине max-w-lg всё в одну строку не помещается.
          */}
          <DialogFooter className="flex-wrap gap-2 sm:flex-wrap sm:gap-2 sm:space-x-0">
            {isEdit && state.mode === 'edit' && (
              <>
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setProtocolForMeeting(state.meeting)}
                  disabled={busy}
                >
                  <FileEdit className="size-4" />
                  {t('meeting.protocol')}
                </Button>
                {showOpenClient && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      onClose()
                      navigate(`/clients/${state.meeting.client_id}`)
                    }}
                    disabled={busy}
                  >
                    <ExternalLink className="size-4" />
                    {t('meeting.open_client')}
                  </Button>
                )}
              </>
            )}
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              {t('common.cancel')}
            </Button>
            {!isEdit && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void submit(true)}
                disabled={busy}
              >
                <FileEdit className="size-4" />
                {t('meeting.create_with_protocol')}
              </Button>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? '…' : isEdit ? t('common.save') : t('common.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <ConfirmDestructiveDialog
      open={confirmDelete}
      itemLabel={t('meeting.delete_confirm')}
      busy={remove.isPending}
      onCancel={() => setConfirmDelete(false)}
      onConfirm={doDelete}
    />

    {protocolForMeeting && (
      <MeetingProtocolDialog
        open={true}
        meetingId={protocolForMeeting.id}
        clientId={protocolForMeeting.client_id}
        onClose={() => {
          setProtocolForMeeting(null)
          // Если протокол открылся из режима «Создать + протокол» — основной
          // диалог встречи ещё открыт и его тоже надо закрыть. В режиме edit
          // на странице клиента основной должен остаться: пользователь
          // редактирует встречу, а протокол был лишь побочной операцией.
          if (!isEdit) onClose()
        }}
      />
    )}
    </>
  )
}
