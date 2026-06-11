/**
 * src/renderer/src/pages/Calendar/index.tsx
 *
 * Большой календарь встреч на base react-big-calendar.
 *
 * Дефолтный вид — «Месяц» (plan §0 #10). Клик по дню открывает диалог
 * создания встречи на этот день; клик по событию — редактирование.
 *
 * Параметр ?date=YYYY-MM-DD приходит из MiniCalendar в сайдбаре —
 * переключаем дату.
 *
 * Подгружаем встречи только в видимом диапазоне через useMeetingsInRange.
 */
import {
  Calendar,
  Views,
  dateFnsLocalizer,
  type SlotInfo,
  type View
} from 'react-big-calendar'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  parse,
  startOfMonth,
  startOfWeek
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { useShellTitle } from '@/components/Layout/AppShell'
import { useClients } from '@/hooks/useClients'
import { useMeetingsInRange } from '@/hooks/useMeetings'
import {
  MeetingDialog,
  type MeetingDialogState
} from '@/components/MeetingDialog'
import { MEETING_STATUS_ACCENT } from '@/lib/meetings'
import type { Meeting } from '@shared/types'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = { ru } as const
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (d: Date) => startOfWeek(d, { weekStartsOn: 1 }),
  getDay,
  locales
})

type RbcEvent = {
  id: number
  title: string
  start: Date
  end: Date
  resource: Meeting
}

export default function CalendarPage() {
  const { t } = useTranslation()
  useShellTitle(t('nav.calendar'))
  const [searchParams] = useSearchParams()
  const dateParam = searchParams.get('date')

  const [date, setDate] = useState<Date>(() => (dateParam ? new Date(dateParam) : new Date()))
  const [view, setView] = useState<View>(Views.MONTH)
  const [dialog, setDialog] = useState<MeetingDialogState | null>(null)

  const messages = useMemo(
    () => ({
      today: t('calendar.today'),
      next: t('calendar.next'),
      previous: t('calendar.previous'),
      month: t('calendar.month'),
      week: t('calendar.week'),
      day: t('calendar.day'),
      agenda: t('calendar.agenda'),
      date: t('calendar.date'),
      time: t('calendar.time'),
      event: t('calendar.event'),
      allDay: t('calendar.all_day'),
      noEventsInRange: t('calendar.no_events_in_range'),
      showMore: (n: number) => t('calendar.show_more', { count: n })
    }),
    [t]
  )

  // Реакция на смену ?date= в URL (приходит из MiniCalendar).
  useEffect(() => {
    if (dateParam) setDate(new Date(dateParam))
  }, [dateParam])

  // Видимый диапазон в зависимости от текущего вида.
  const { from, to } = useMemo(() => {
    if (view === Views.MONTH) {
      const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 })
      const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 })
      return { from: start.toISOString(), to: end.toISOString() }
    }
    if (view === Views.WEEK) {
      const start = startOfWeek(date, { weekStartsOn: 1 })
      const end = endOfWeek(date, { weekStartsOn: 1 })
      return { from: start.toISOString(), to: end.toISOString() }
    }
    // day / agenda — берём день
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    return { from: start.toISOString(), to: end.toISOString() }
  }, [date, view])

  const { data: meetings } = useMeetingsInRange(from, to)
  const { data: clients } = useClients({ includeArchived: false })

  const events: RbcEvent[] = useMemo(() => {
    const byId = new Map((clients ?? []).map((c) => [c.id, c]))
    return (meetings ?? []).map((m) => ({
      id: m.id,
      title: byId.get(m.client_id)?.full_name ?? t('calendar.client_fallback', { id: m.client_id }),
      start: new Date(m.starts_at),
      end: new Date(m.ends_at),
      resource: m
    }))
  }, [meetings, clients, t])

  function onSelectSlot(slot: SlotInfo) {
    setDialog({ mode: 'create', preset: { start: slot.start as Date } })
  }

  function onSelectEvent(ev: RbcEvent) {
    setDialog({ mode: 'edit', meeting: ev.resource })
  }

  function eventPropGetter(ev: RbcEvent) {
    const bg = MEETING_STATUS_ACCENT[ev.resource.status]
    return {
      style: {
        backgroundColor: bg,
        border: 'none',
        color: 'white',
        opacity: ev.resource.status === 'cancelled' ? 0.7 : 1
      }
    }
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div className="psynote-rbc flex-1">
        <Calendar
          localizer={localizer}
          culture="ru"
          messages={messages}
          events={events}
          startAccessor="start"
          endAccessor="end"
          views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
          view={view}
          onView={setView}
          defaultView={Views.MONTH}
          date={date}
          onNavigate={setDate}
          onSelectSlot={onSelectSlot}
          onSelectEvent={onSelectEvent}
          selectable
          eventPropGetter={eventPropGetter}
          style={{ height: '100%' }}
        />
      </div>

      <MeetingDialog
        open={dialog !== null}
        state={dialog}
        onClose={() => setDialog(null)}
      />
    </div>
  )
}
