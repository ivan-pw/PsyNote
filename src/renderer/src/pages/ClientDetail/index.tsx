/**
 * src/renderer/src/pages/ClientDetail/index.tsx
 *
 * Страница карточки клиента.
 *
 *   ┌─────────────────────────────┬─────────────────────────┐
 *   │  SessionsList               │ ▸ Информация о клиенте  │
 *   │  (карточки сессий,          │ ▸ Заметки               │
 *   │   последняя — сверху)       │ ▸ История изменений     │
 *   │                             │   (ClientTimeline)      │
 *   └─────────────────────────────┴─────────────────────────┘
 *
 * Главный экран — проведённые сессии (повестка + домашка в каждой карточке).
 * Сайдбар — раскрывающиеся секции: информация о клиенте, заметки и история.
 *
 * Все события истории (кроме client_created) кликабельны и открывают
 * соответствующий диалог. Универсальный dispatch — ниже в openTimeline().
 *
 * Кнопка «В архив» спрашивает подтверждение через ConfirmDestructiveDialog,
 * чтобы случайным кликом не отправить клиента в корзину.
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Archive,
  ArchiveRestore,
  History,
  IdCard,
  StickyNote
} from 'lucide-react'
import {
  useArchiveClient,
  useClient,
  useRestoreClient
} from '@/hooks/useClients'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/sonner'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import { useShellTitle } from '@/components/Layout/AppShell'
import { ClientTimeline } from '@/components/Timeline/ClientTimeline'
import { SessionsList } from '@/components/Sessions/SessionsList'
import { PermanentFieldsPanel } from '@/components/ClientFields/PermanentFieldsPanel'
import { AnamnesisDialog } from '@/components/AnamnesisDialog'
import { ConfirmDestructiveDialog } from '@/components/ConfirmDestructiveDialog'
import { MeetingDialog, type MeetingDialogState } from '@/components/MeetingDialog'
import { MeetingProtocolDialog } from '@/components/MeetingProtocolDialog'
import { NotesPanel } from '@/components/Notes/NotesPanel'
import {
  NoteDialog,
  type NoteDialogState
} from '@/components/Notes/NoteDialog'
import { RevisionEditDialog } from '@/components/ClientFields/RevisionEditDialog'
import { meetingsApi } from '@/api/meetings'
import { notesApi } from '@/api/notes'
import { formatDate } from '@/lib/format'
import { clientAge, formatAge } from '@/lib/age'
import type { Meeting, Note, TimelineEvent } from '@shared/types'

type AnamnesisState =
  | { open: false }
  | { open: true; anamnesisId: number | null }

type RevisionDialogState = {
  open: boolean
  revisionId: number
  fieldKey: string | null
  value: string | null
  prevValue: string | null
  changedAt: string
  note: string | null
}

type ProtocolDialogState = { open: boolean; meetingId: number }

export default function ClientDetailPage() {
  const { t } = useTranslation()
  const { id: idParam } = useParams<{ id: string }>()
  const id = idParam ? Number(idParam) : null
  const navigate = useNavigate()
  const { data: client, isLoading, error } = useClient(id)
  const archive = useArchiveClient()
  const restore = useRestoreClient()

  const [anamnesis, setAnamnesis] = useState<AnamnesisState>({ open: false })
  const [meetingDialog, setMeetingDialog] = useState<MeetingDialogState | null>(null)
  const [noteDialog, setNoteDialog] = useState<NoteDialogState | null>(null)
  const [protocol, setProtocol] = useState<ProtocolDialogState | null>(null)
  const [revision, setRevision] = useState<RevisionDialogState | null>(null)
  const [confirmArchive, setConfirmArchive] = useState(false)

  useShellTitle(client?.full_name ?? t('client.title'))

  // Заранее «прогреваем» нужные сущности на запрос. Загружаются по факту.
  useEffect(() => {
    // no-op: оставлено как место для пред-загрузок при необходимости
  }, [client?.id])

  if (id === null || Number.isNaN(id)) {
    return (
      <div className="p-6 text-sm text-destructive">{t('client.invalid_id')}</div>
    )
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">{t('app.loading')}</div>
  }
  if (error || !client) {
    return (
      <div className="p-6 text-sm text-destructive">
        {error instanceof Error ? error.message : t('client.not_found')}
      </div>
    )
  }

  const archived = Boolean(client.archived_at)

  /** Универсальный обработчик клика по событию таймлайна. */
  async function openTimeline(ev: TimelineEvent) {
    try {
      switch (ev.kind) {
        case 'meeting': {
          // Подгружаем актуальную запись (в VIEW нет полного объекта).
          const m: Meeting = await meetingsApi
            .listInRange(ev.at, new Date(new Date(ev.at).getTime() + 1).toISOString())
            .then(
              (list) => list.find((x) => x.id === ev.ref_id) ?? listFirstOrThrow(list)
            )
            .catch(async () => {
              // Фоллбэк — listByClient (медленнее, но не зависит от точности at)
              const all = await meetingsApi.listByClient(ev.client_id)
              const found = all.find((x) => x.id === ev.ref_id)
              if (!found) throw new Error(t('meeting.not_found'))
              return found
            })
          setMeetingDialog({ mode: 'edit', meeting: m })
          return
        }
        case 'anamnesis':
          setAnamnesis({ open: true, anamnesisId: ev.ref_id })
          return
        case 'note_event': {
          const noteId = ev.extra ? Number(ev.extra) : NaN
          if (Number.isNaN(noteId) || ev.aux1 === 'delete') {
            // Удалённая заметка → редактировать нечего, показываем тост.
            toast.info(t('notes.already_deleted_nothing'))
            return
          }
          const all = await notesApi.listByClient(ev.client_id)
          const note: Note | undefined = all.find((n) => n.id === noteId)
          if (!note) {
            toast.info(t('notes.already_deleted'))
            return
          }
          setNoteDialog({ mode: 'edit', note })
          return
        }
        case 'protocol': {
          const meetingId = ev.aux1 ? Number(ev.aux1) : NaN
          if (Number.isNaN(meetingId)) {
            toast.error(t('protocol.cannot_find_meeting'))
            return
          }
          setProtocol({ open: true, meetingId })
          return
        }
        case 'revision':
          setRevision({
            open: true,
            revisionId: ev.ref_id,
            fieldKey: ev.aux1,
            value: ev.payload_text,
            prevValue: ev.aux2,
            changedAt: ev.at,
            note: ev.extra
          })
          return
        case 'client_created':
          return
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="grid h-full grid-cols-[minmax(0,1fr)_360px] gap-0">
      {/* Левая колонка — Timeline */}
      <div className="flex h-full flex-col border-r">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('common.back')}
            onClick={() => navigate('/clients')}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">{client.full_name}</h2>
              {archived && <Badge variant="secondary">{t('clients.archived_badge')}</Badge>}
            </div>
            <div className="text-xs text-muted-foreground">
              {(() => {
                const age = clientAge(client.birth_date, client.birth_year)
                return age ? (
                  <>
                    {formatAge(age.years, age.approximate)}
                    {client.birth_date && <> ({t('client.born', { date: formatDate(client.birth_date) })})</>}
                    {' · '}
                  </>
                ) : null
              })()}
              {t('client.created', { date: formatDate(client.created_at) })}
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setMeetingDialog({
                  mode: 'create',
                  preset: { clientId: client.id, start: new Date() }
                })
              }
            >
              {t('client.add_meeting')}
            </Button>
            {archived ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => restore.mutate(client.id)}
              >
                <ArchiveRestore className="size-4" />
                {t('common.restore')}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmArchive(true)}
              >
                <Archive className="size-4" />
                {t('common.archive')}
              </Button>
            )}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <SessionsList
            clientId={client.id}
            onCreateMeeting={() =>
              setMeetingDialog({
                mode: 'create',
                preset: { clientId: client.id, start: new Date() }
              })
            }
            onEditMeeting={(m) => setMeetingDialog({ mode: 'edit', meeting: m })}
            onOpenProtocol={(meetingId) => setProtocol({ open: true, meetingId })}
          />
        </div>
      </div>

      {/* Правая колонка — информация о клиенте, заметки, история изменений */}
      <div className="h-full overflow-auto px-4 py-2">
        <Accordion
          type="multiple"
          defaultValue={['info', 'notes']}
          className="w-full"
        >
          <AccordionItem value="info">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <IdCard className="size-4 text-muted-foreground" />
                {t('client.info_section')}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <PermanentFieldsPanel
                client={client}
                onAddAnamnesis={() => setAnamnesis({ open: true, anamnesisId: null })}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="notes">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <StickyNote className="size-4 text-muted-foreground" />
                {t('notes.title')}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <NotesPanel clientId={client.id} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="history">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <History className="size-4 text-muted-foreground" />
                {t('client.history_section')}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {/* Фиксированная высота: внутри ClientTimeline собственный скролл. */}
              <div className="h-[32rem] overflow-hidden rounded-lg border">
                <ClientTimeline clientId={client.id} onOpen={openTimeline} />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <AnamnesisDialog
        open={anamnesis.open}
        clientId={client.id}
        anamnesisId={anamnesis.open ? anamnesis.anamnesisId : null}
        onClose={() => setAnamnesis({ open: false })}
      />

      <MeetingDialog
        open={meetingDialog !== null}
        state={meetingDialog}
        onClose={() => setMeetingDialog(null)}
        // На странице самого клиента кнопка «Открыть клиента» избыточна.
        showOpenClient={false}
      />

      <NoteDialog
        open={noteDialog !== null}
        clientId={client.id}
        state={noteDialog}
        onClose={() => setNoteDialog(null)}
      />

      {protocol && (
        <MeetingProtocolDialog
          open={protocol.open}
          meetingId={protocol.meetingId}
          clientId={client.id}
          onClose={() => setProtocol(null)}
        />
      )}

      {revision && (
        <RevisionEditDialog
          open={revision.open}
          clientId={client.id}
          revisionId={revision.revisionId}
          fieldKey={revision.fieldKey}
          value={revision.value}
          prevValue={revision.prevValue}
          changedAt={revision.changedAt}
          note={revision.note}
          onClose={() => setRevision(null)}
        />
      )}

      <ConfirmDestructiveDialog
        open={confirmArchive}
        itemLabel={t('client.archive_confirm', { name: client.full_name })}
        busy={archive.isPending}
        onCancel={() => setConfirmArchive(false)}
        onConfirm={async () => {
          await archive.mutateAsync(client.id)
          setConfirmArchive(false)
        }}
      />
    </div>
  )
}

function listFirstOrThrow<T>(list: T[]): T {
  if (list.length === 0) throw new Error('Пусто')
  return list[0] as T
}
