/**
 * src/renderer/src/components/Sessions/SessionsList.tsx
 *
 * Главный экран карточки клиента: проведённые (и запланированные) сессии.
 * Последняя сессия — сверху. Номер сессии считается хронологически
 * (первая по времени = «Сессия 1»); отменённые встречи не нумеруются.
 */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMeetingsByClient } from '@/hooks/useMeetings'
import { SessionCard } from './SessionCard'
import type { Meeting } from '@shared/types'

type Props = {
  clientId: number
  onCreateMeeting: () => void
  onEditMeeting: (meeting: Meeting) => void
  onOpenProtocol: (meetingId: number) => void
}

export function SessionsList({
  clientId,
  onCreateMeeting,
  onEditMeeting,
  onOpenProtocol
}: Props) {
  const { t } = useTranslation()
  const { data: meetings, isLoading, error } = useMeetingsByClient(clientId)

  // Нумеруем по возрастанию времени, показываем по убыванию.
  const numbered = useMemo(() => {
    const sorted = [...(meetings ?? [])].sort((a, b) =>
      a.starts_at.localeCompare(b.starts_at)
    )
    let n = 0
    return sorted
      .map((m) => ({
        meeting: m,
        number: m.status === 'cancelled' ? null : ++n
      }))
      .reverse()
  }, [meetings])

  if (isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">{t('app.loading')}</p>
  }
  if (error) {
    return (
      <p className="p-6 text-sm text-destructive">
        {t('common.error')}: {error instanceof Error ? error.message : String(error)}
      </p>
    )
  }

  if (numbered.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-10 text-center">
        <p className="text-sm text-muted-foreground">{t('session.empty')}</p>
        <Button variant="outline" size="sm" onClick={onCreateMeeting}>
          <CalendarPlus className="size-4" />
          {t('session.add_meeting')}
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 p-4">
      {numbered.map(({ meeting, number }) => (
        <SessionCard
          key={meeting.id}
          meeting={meeting}
          number={number}
          clientId={clientId}
          onEditMeeting={() => onEditMeeting(meeting)}
          onOpenProtocol={() => onOpenProtocol(meeting.id)}
        />
      ))}
    </div>
  )
}
