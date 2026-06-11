/**
 * src/renderer/src/components/EulaGate.tsx
 *
 * Шлюз лицензионного соглашения. Показывается ДО setup/unlock:
 * принятие хранится в plain-файле userData/eula.json (IPC `eula:*`),
 * поэтому не зависит от зашифрованной БД.
 *
 * Содержимое: краткая выжимка (RU/EN) сверху + полный текст LICENSE
 * (юридический, EN) ниже, в одном скролле. Кнопка «Принимаю» активна
 * только после чекбокса; «Не принимаю» завершает приложение.
 *
 * Версия соглашения — CURRENT_EULA_VERSION; при её повышении гейт
 * показывается снова (в т.ч. пользователям, принимавшим старую версию).
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ScrollText, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/sonner'
import { useLocaleStore } from '@/store/localeStore'
import {
  CURRENT_EULA_VERSION,
  EULA_TEXT_EN,
  EULA_TEXT_RU,
  LICENSE_FULL_TEXT
} from '@/lib/eula'

const eulaKeys = { status: ['eula', 'status'] as const }

export function EulaGate({ children }: { children: React.ReactNode }) {
  const locale = useLocaleStore((s) => s.locale)
  const qc = useQueryClient()
  const [checked, setChecked] = useState(false)

  const { data: status, isFetched } = useQuery({
    queryKey: eulaKeys.status,
    queryFn: () => window.api.eula.status(),
    staleTime: Infinity
  })

  const accept = useMutation({
    mutationFn: () => window.api.eula.accept(CURRENT_EULA_VERSION),
    onSuccess: () => {
      qc.setQueryData(eulaKeys.status, { acceptedVersion: CURRENT_EULA_VERSION })
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : String(err))
  })

  // Пока статус в полёте — пустой экран, чтобы UI не мигал.
  if (!isFetched) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">…</div>
      </div>
    )
  }

  const consented =
    typeof status?.acceptedVersion === 'number' &&
    status.acceptedVersion >= CURRENT_EULA_VERSION
  if (consented) return <>{children}</>

  const en = locale === 'en'
  const summary = en ? EULA_TEXT_EN : EULA_TEXT_RU

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex shrink-0 items-center gap-2 border-b px-6 py-4">
        <ShieldAlert className="size-5 text-primary" />
        <div>
          <h1 className="text-base font-semibold tracking-tight">
            {en
              ? 'License agreement'
              : 'Лицензионное соглашение'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {en
              ? 'Please read and accept the terms before using PsyNote.'
              : 'Прочитайте и примите условия перед началом работы с PsyNote.'}
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
          {/* Краткая выжимка */}
          <div className="whitespace-pre-line break-words text-sm leading-relaxed">
            {summary}
          </div>

          <Separator />

          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ScrollText className="size-4" />
            {en
              ? 'Full license text (legally binding, English)'
              : 'Полный текст лицензии (юридически обязательный, англ.)'}
          </div>

          {/* Полный юридический текст LICENSE */}
          <pre className="whitespace-pre-wrap break-words rounded-md border bg-card/40 p-4 font-mono text-xs leading-relaxed text-foreground">
            {LICENSE_FULL_TEXT}
          </pre>
        </div>
      </div>

      <footer className="shrink-0 border-t px-6 py-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-primary"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            {en
              ? 'I have read and accept the terms above, including the full license text.'
              : 'Я прочитал(а) и принимаю изложенные выше условия, включая полный текст лицензии.'}
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void window.api.app.quit()}
              disabled={accept.isPending}
            >
              {en ? 'Decline & quit' : 'Не принимаю — выйти'}
            </Button>
            <Button
              type="button"
              onClick={() => accept.mutate()}
              disabled={!checked || accept.isPending}
            >
              {accept.isPending ? '…' : en ? 'I accept' : 'Принимаю'}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  )
}
