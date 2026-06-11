/**
 * src/renderer/src/components/WeakPasswordGate.tsx
 *
 * Принудительная смена пароля после unlock, если main-процесс выставил
 * один из флагов:
 *   - weakPasswordDetected — пароль не соответствует новым требованиям
 *     (длина < PASSWORD_MIN_LENGTH);
 *   - kdfNeedsUpgrade — файл соли в старом формате (v1, PBKDF2). После
 *     смены пароля БД автоматически мигрирует на Argon2id v2.
 *
 * Диалог нельзя закрыть Esc / кликом вне. Доступны только две кнопки:
 *   - «Сменить пароль» — отправляет change-password (со старым и новым);
 *   - «Выйти» — закрывает приложение через app.quit().
 *
 * Состояние флагов получаем разово после успешного unlock из IPC; после
 * смены пароля main сбрасывает их в false.
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldAlert } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { PasswordStrengthMeter } from '@/components/PasswordStrengthMeter'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import {
  PASSWORD_MIN_LENGTH,
  checkPasswordStrength
} from '@/lib/passwordStrength'

const SECURITY_FLAGS_KEY = ['auth', 'security-flags'] as const

export function WeakPasswordGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const unlocked = useAuthStore((s) => s.unlocked)
  const qc = useQueryClient()

  const { data: flags, isFetched } = useQuery({
    queryKey: SECURITY_FLAGS_KEY,
    queryFn: () => authApi.getSecurityFlags(),
    enabled: unlocked,
    staleTime: Infinity
  })

  const [oldP, setOldP] = useState('')
  const [newP, setNewP] = useState('')
  const [newP2, setNewP2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // При закрытии (unlock=false) очистим формы.
  useEffect(() => {
    if (!unlocked) {
      setOldP('')
      setNewP('')
      setNewP2('')
      setError(null)
    }
  }, [unlocked])

  // До unlock — пропускаем дальше; Unlock-страница свою работу делает сама.
  if (!unlocked) return <>{children}</>

  // Пока статус летит — короткая заглушка (предотвращает «мигание» UI,
  // когда основной экран успевает показаться до проверки).
  if (!isFetched) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">…</div>
      </div>
    )
  }

  const mustChange = Boolean(
    flags && (flags.weakPasswordDetected || flags.kdfNeedsUpgrade)
  )
  if (!mustChange) return <>{children}</>

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (newP !== newP2) {
      setError(t('security.passwords_mismatch'))
      return
    }
    if (newP.length < PASSWORD_MIN_LENGTH) {
      setError(t('security.new_password_min', { min: PASSWORD_MIN_LENGTH }))
      return
    }
    const strength = checkPasswordStrength(newP)
    if (!strength.ok) {
      setError(strength.hints[0] ?? t('unlock.error_predictable'))
      return
    }
    setBusy(true)
    try {
      await authApi.changePassword(oldP, newP)
      // Перечитываем флаги — после успешной смены main вернёт false/false
      // и шлюз сам пропустит дальше.
      await qc.invalidateQueries({ queryKey: SECURITY_FLAGS_KEY })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const reasonLines: string[] = []
  if (flags?.weakPasswordDetected) {
    reasonLines.push(t('security.weak_password_reason', { min: PASSWORD_MIN_LENGTH }))
  }
  if (flags?.kdfNeedsUpgrade) {
    reasonLines.push(t('security.kdf_upgrade_reason'))
  }

  return (
    <>
      {/* children рендерятся «под» диалогом и приглушены, чтобы был
          понятен контекст, но взаимодействовать с ними нельзя. */}
      <div aria-hidden className="pointer-events-none opacity-50 blur-sm">
        {children}
      </div>
      <Dialog open modal>
        <DialogContent
          className="max-w-md"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-primary" />
              {t('security.change_required_title')}
            </DialogTitle>
            <DialogDescription>
              {reasonLines.map((l, i) => (
                <span key={i} className="block">
                  {l}
                </span>
              ))}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="gate-old">{t('security.current_password')}</Label>
              <Input
                id="gate-old"
                type="password"
                autoComplete="current-password"
                autoFocus
                value={oldP}
                onChange={(e) => setOldP(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="gate-new">{t('security.new_password')}</Label>
              <Input
                id="gate-new"
                type="password"
                autoComplete="new-password"
                value={newP}
                onChange={(e) => setNewP(e.target.value)}
                disabled={busy}
              />
              <PasswordStrengthMeter password={newP} className="mt-1.5" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="gate-new2">{t('security.repeat_new_password')}</Label>
              <Input
                id="gate-new2"
                type="password"
                autoComplete="new-password"
                value={newP2}
                onChange={(e) => setNewP2(e.target.value)}
                disabled={busy}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => void window.api.app.quit()}
                disabled={busy}
              >
                {t('security.quit')}
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? '…' : t('security.change_password')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
