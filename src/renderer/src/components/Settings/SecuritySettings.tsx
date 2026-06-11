/**
 * src/renderer/src/components/Settings/SecuritySettings.tsx
 *
 * Раздел «Безопасность» (план §6.5):
 *  - Смена пароля (auth:change-password — проверка старого, PRAGMA rekey,
 *    ротация соли).
 *  - Таймаут автоблокировки (settings.autolock_minutes; 0 = не блокировать
 *    автоматически). Реальный таймер живёт в AutoLockGuard (см. AppShell).
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock, Save } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordStrengthMeter } from '@/components/PasswordStrengthMeter'
import { authApi } from '@/api/auth'
import { useSettingMutation, useSettingQuery } from '@/hooks/useSetting'
import { PASSWORD_MIN_LENGTH, checkPasswordStrength } from '@/lib/passwordStrength'

const DEFAULT_AUTOLOCK_MIN = 15

export function SecuritySettings() {
  const { t } = useTranslation()
  const [oldP, setOldP] = useState('')
  const [newP, setNewP] = useState('')
  const [newP2, setNewP2] = useState('')
  const [busy, setBusy] = useState(false)

  // autolock_enabled — отдельный булев флаг (по умолчанию false), пользователь
  // включает его явно. autolock_minutes — таймер; меняется отдельно.
  const { data: autolockEnabled } = useSettingQuery<boolean>('autolock_enabled', false)
  const setAutolockEnabled = useSettingMutation('autolock_enabled')
  const { data: autolock } = useSettingQuery<number>('autolock_minutes', DEFAULT_AUTOLOCK_MIN)
  const setAutolock = useSettingMutation('autolock_minutes')

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newP !== newP2) {
      toast.error(t('security.passwords_mismatch'))
      return
    }
    if (newP.length < PASSWORD_MIN_LENGTH) {
      toast.error(t('security.new_password_min', { min: PASSWORD_MIN_LENGTH }))
      return
    }
    const strength = checkPasswordStrength(newP)
    if (!strength.ok) {
      toast.error(strength.hints[0] ?? t('unlock.error_predictable'))
      return
    }
    setBusy(true)
    try {
      await authApi.changePassword(oldP, newP)
      toast.success(t('security.password_updated'))
      setOldP('')
      setNewP('')
      setNewP2('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  function handleAutolockChange(value: string) {
    const n = Math.max(1, Math.min(240, Math.floor(Number(value) || 1)))
    setAutolock.mutate(n)
  }

  return (
    <section className="space-y-6">
      {/* — Смена пароля — */}
      <form onSubmit={handleChangePassword} className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">{t('security.change_password_title')}</h3>
          <p className="text-xs text-muted-foreground">
            {t('security.change_password_description')}
          </p>
        </div>
        <div className="grid max-w-md grid-cols-1 gap-3">
          <div className="space-y-1">
            <Label htmlFor="old-p">{t('security.current_password')}</Label>
            <Input
              id="old-p"
              type="password"
              autoComplete="current-password"
              value={oldP}
              onChange={(e) => setOldP(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-p">{t('security.new_password')}</Label>
            <Input
              id="new-p"
              type="password"
              autoComplete="new-password"
              value={newP}
              onChange={(e) => setNewP(e.target.value)}
            />
            <PasswordStrengthMeter password={newP} className="mt-1.5" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-p2">{t('security.repeat_new_password')}</Label>
            <Input
              id="new-p2"
              type="password"
              autoComplete="new-password"
              value={newP2}
              onChange={(e) => setNewP2(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy} className="w-fit">
            {busy ? '…' : (
              <>
                <Save className="size-4" />
                {t('security.change_password')}
              </>
            )}
          </Button>
        </div>
      </form>

      {/* — Автоблокировка — */}
      <div className="space-y-3 border-t pt-6">
        <div>
          <h3 className="text-sm font-semibold">{t('security.autolock_title')}</h3>
          <p className="text-xs text-muted-foreground">
            {t('security.autolock_description')}
          </p>
        </div>

        <label className="flex max-w-md select-none items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(autolockEnabled)}
            onChange={(e) => setAutolockEnabled.mutate(e.target.checked)}
            className="size-4"
          />
          {t('security.autolock_toggle')}
        </label>

        <div className="flex max-w-md items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="autolock">{t('security.autolock_timeout')}</Label>
            <Input
              id="autolock"
              type="number"
              min={1}
              max={240}
              value={autolock ?? DEFAULT_AUTOLOCK_MIN}
              onChange={(e) => handleAutolockChange(e.target.value)}
              className="w-24"
              disabled={!autolockEnabled}
            />
          </div>
          <Lock className="mb-2 size-4 text-muted-foreground" />
        </div>
      </div>
    </section>
  )
}
