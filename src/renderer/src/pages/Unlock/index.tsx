/**
 * src/renderer/src/pages/Unlock/index.tsx
 *
 * Экран блокировки. Два режима:
 *  - setup: БД не инициализирована → задать пароль (требуется подтверждение).
 *  - unlock: БД есть → ввести пароль для расшифровки.
 *
 * После успеха useAuthStore обновляет флаг unlocked, и router пускает
 * пользователя на /clients (см. App.tsx).
 *
 * Этап 1 — внешний вид минималистичный, но полностью функциональный.
 * В этапе 6 здесь же будет переключатель темы/языка и брендирование.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordStrengthMeter } from '@/components/PasswordStrengthMeter'
import { checkPasswordStrength, PASSWORD_MIN_LENGTH } from '@/lib/passwordStrength'
import { useAuthStore } from '@/store/authStore'

export default function UnlockPage() {
  const { t } = useTranslation()
  const initialized = useAuthStore((s) => s.initialized)
  const setupPassword = useAuthStore((s) => s.setupPassword)
  const unlock = useAuthStore((s) => s.unlock)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const isSetup = !initialized

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (isSetup) {
      if (password.length < PASSWORD_MIN_LENGTH) {
        setError(t('unlock.error_min_length', { min: PASSWORD_MIN_LENGTH }))
        return
      }
      if (password !== confirm) {
        setError(t('unlock.error_mismatch'))
        return
      }
      const strength = checkPasswordStrength(password)
      if (!strength.ok) {
        setError(strength.hints[0] ?? t('unlock.error_predictable'))
        return
      }
      setBusy(true)
      try {
        await setupPassword(password)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setBusy(false)
      }
    } else {
      if (!password) {
        setError(t('unlock.error_empty'))
        return
      }
      setBusy(true)
      try {
        const ok = await unlock(password)
        if (!ok) setError(t('unlock.error_wrong'))
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setBusy(false)
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-8 shadow-sm"
      >
        <div className="flex flex-col items-center gap-2">
          <div className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
            {isSetup ? <ShieldCheck className="size-6" /> : <Lock className="size-6" />}
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            {isSetup ? t('unlock.create_title') : t('unlock.enter_title')}
          </h1>
          <p className="text-center text-sm text-muted-foreground">
            {isSetup ? t('unlock.setup_hint') : t('unlock.unlock_hint')}
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="password">{t('unlock.password')}</Label>
            <Input
              id="password"
              type="password"
              autoFocus
              autoComplete={isSetup ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
          </div>
          {isSetup && (
            <>
              <PasswordStrengthMeter password={password} />
              <div className="space-y-1">
                <Label htmlFor="confirm">{t('unlock.confirm_password')}</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={busy}
                />
              </div>
            </>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? '...' : isSetup ? t('common.create') : t('unlock.login')}
        </Button>
      </form>
    </div>
  )
}
