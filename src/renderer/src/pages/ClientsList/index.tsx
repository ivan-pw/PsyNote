/**
 * src/renderer/src/pages/ClientsList/index.tsx
 *
 * Список клиентов (plan §6.2).
 * Этап 2: ФИО, телефон, email, дата создания, кнопки архива/восстановления.
 * Сортировка — по ФИО (бэк уже отдаёт COLLATE NOCASE).
 * Фильтры: чекбокс «показать архивные» + локальный поиск по подстроке.
 *
 * Глобальный поиск (FTS5, по всем сущностям) — этап 6.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Archive, ArchiveRestore, Search, Trash2 } from 'lucide-react'
import { useShellTitle } from '@/components/Layout/AppShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import {
  useArchiveClient,
  useClients,
  useRestoreClient
} from '@/hooks/useClients'
import { formatDate } from '@/lib/format'
import { CreateClientDialog } from '@/components/CreateClientDialog'

export default function ClientsListPage() {
  const { t } = useTranslation()
  useShellTitle(t('clients.title'))
  const [includeArchived, setIncludeArchived] = useState(false)
  const [q, setQ] = useState('')
  const { data, isLoading, error } = useClients({ includeArchived })
  const archive = useArchiveClient()
  const restore = useRestoreClient()

  const filtered = useMemo(() => {
    const list = data ?? []
    if (!q.trim()) return list
    const needle = q.trim().toLowerCase()
    return list.filter((c) =>
      [
        c.full_name,
        c.current_phone,
        c.current_email,
        c.notes_short
      ]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(needle))
    )
  }, [data, q])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-6 py-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('clients.search_placeholder')}
            className="pl-8"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <label className="flex select-none items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />
          {t('clients.show_archived')}
        </label>

        <div className="ml-auto">
          <CreateClientDialog />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">{t('app.loading')}</p>
        ) : error ? (
          <p className="p-6 text-sm text-destructive">
            {t('common.error')}: {error instanceof Error ? error.message : String(error)}
          </p>
        ) : filtered.length === 0 ? (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            {data && data.length === 0 ? t('clients.empty') : t('clients.not_found')}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background/95 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur">
              <tr className="border-b">
                <th className="px-6 py-2 text-left font-medium">{t('client.full_name')}</th>
                <th className="px-2 py-2 text-left font-medium">{t('fields.phone')}</th>
                <th className="px-2 py-2 text-left font-medium">{t('fields.email')}</th>
                <th className="px-2 py-2 text-left font-medium">{t('clients.col_created')}</th>
                <th className="px-6 py-2 text-right font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const archived = Boolean(c.archived_at)
                return (
                  <tr
                    key={c.id}
                    className="group border-b transition-colors hover:bg-accent/40"
                  >
                    <td className="px-6 py-2">
                      <Link
                        to={`/clients/${c.id}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <span className="font-medium">{c.full_name}</span>
                        {archived && <Badge variant="secondary">{t('clients.archived_badge')}</Badge>}
                      </Link>
                      {c.notes_short && (
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {c.notes_short}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {c.current_phone ?? '—'}
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {c.current_email ?? '—'}
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {formatDate(c.created_at)}
                    </td>
                    <td className="px-6 py-2 text-right">
                      <div className="invisible flex items-center justify-end gap-1 group-hover:visible">
                        {archived ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => restore.mutate(c.id)}
                              >
                                <ArchiveRestore className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('common.restore')}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => archive.mutate(c.id)}
                              >
                                <Archive className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('common.archive')}</TooltipContent>
                          </Tooltip>
                        )}
                        {archived && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground"
                                disabled
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('clients.delete_hint')}</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
