/**
 * src/renderer/src/App.tsx
 *
 * Корневой компонент.
 *
 *  - Подключает провайдеры (QueryClient, TooltipProvider, ThemeProvider).
 *  - Инициализирует i18n (через статический импорт lib/i18n.ts).
 *  - Опрашивает authStore.refresh() для определения, инициализирована ли БД.
 *  - После unlock дополнительно подтягивает theme/locale из БД (если ранее
 *    сохранены) — это даёт сквозной user experience: пароль → твоя тема/язык.
 */
import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from '@/components/ThemeProvider'
import { AutoLockGuard } from '@/components/AutoLockGuard'
import { EulaGate } from '@/components/EulaGate'
import { WeakPasswordGate } from '@/components/WeakPasswordGate'
import { Toaster } from '@/components/ui/sonner'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { useLocaleStore } from '@/store/localeStore'
import { AppRouter } from '@/router'
import '@/lib/i18n'

export default function App() {
  const loading = useAuthStore((s) => s.loading)
  const unlocked = useAuthStore((s) => s.unlocked)
  const refresh = useAuthStore((s) => s.refresh)
  const loadTheme = useThemeStore((s) => s.load)
  const loadLocale = useLocaleStore((s) => s.load)

  useEffect(() => {
    refresh().catch(console.error)
  }, [refresh])

  // Подгружаем сохранённые тему/локаль из БД после расшифровки.
  useEffect(() => {
    if (!unlocked) return
    void loadTheme()
    void loadLocale()
  }, [unlocked, loadTheme, loadLocale])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider delayDuration={200}>
          {/* EulaGate — снаружи: соглашение принимается до setup/unlock,
              его статус хранится в plain-файле и не требует открытой БД. */}
          <EulaGate>
            <AutoLockGuard>
              {loading ? (
                <div className="flex min-h-screen items-center justify-center">
                  <div className="text-sm text-muted-foreground">Загрузка…</div>
                </div>
              ) : (
                <WeakPasswordGate>
                  <AppRouter />
                </WeakPasswordGate>
              )}
            </AutoLockGuard>
          </EulaGate>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
