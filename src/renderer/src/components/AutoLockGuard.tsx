/**
 * src/renderer/src/components/AutoLockGuard.tsx
 *
 * Слушает активность (mousemove / mousedown / keydown / touchstart) и через
 * `autolock_minutes` минут бездействия вызывает auth.lock(). За 30 секунд до
 * блокировки показывает тост с кнопкой «продлить».
 *
 * Таймаут читается из settings (см. SecuritySettings). 0 → автоблокировка
 * выключена.
 *
 * Активный gating-таймер сбрасывается на любое событие активности. Таймер
 * предупреждения тоже сбрасывается.
 */
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from '@/components/ui/sonner'
import { useSettingQuery } from '@/hooks/useSetting'
import { useAuthStore } from '@/store/authStore'

const WARN_BEFORE_MS = 30_000 // показать «осталось 30 с» за полминуты до блокировки
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart'] as const

export function AutoLockGuard({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const unlocked = useAuthStore((s) => s.unlocked)
  const lock = useAuthStore((s) => s.lock)
  // По умолчанию автоблокировка выключена. Включается явно в Settings.
  const { data: enabled } = useSettingQuery<boolean>('autolock_enabled', false)
  const { data: minutes } = useSettingQuery<number>('autolock_minutes', 15)

  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnedRef = useRef(false)

  useEffect(() => {
    if (!unlocked) return
    if (!enabled) return // явный toggle
    const m = minutes ?? 15
    if (!m || m <= 0) return

    const totalMs = m * 60_000
    const warnMs = Math.max(0, totalMs - WARN_BEFORE_MS)

    function clearTimers() {
      if (lockTimer.current) clearTimeout(lockTimer.current)
      if (warnTimer.current) clearTimeout(warnTimer.current)
      lockTimer.current = null
      warnTimer.current = null
    }

    function arm() {
      clearTimers()
      warnedRef.current = false
      warnTimer.current = setTimeout(() => {
        warnedRef.current = true
        toast.warning(t('security.autolock_warning'), {
          description: t('security.autolock_warning_description'),
          duration: WARN_BEFORE_MS
        })
      }, warnMs)
      lockTimer.current = setTimeout(() => {
        void lock()
      }, totalMs)
    }

    function onActivity() {
      arm()
    }

    arm()
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, onActivity, { passive: true })
    }
    return () => {
      clearTimers()
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, onActivity)
      }
    }
  }, [unlocked, enabled, minutes, lock, t])

  return <>{children}</>
}
