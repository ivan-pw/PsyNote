/**
 * src/renderer/src/components/CreateClientDialog.tsx
 *
 * Модалка создания клиента. ФИО — обязательное; всё остальное необязательно.
 * Заполненные историзируемые поля (телефон, email, мессенджер, видео-ссылка,
 * диагноз, медикаменты) на стороне main превратятся в первые ревизии
 * (clientsRepo.createClient, см. main).
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus } from 'lucide-react'
import { useCreateClient } from '@/hooks/useClients'
import {
  HISTORIZED_FIELDS,
  HISTORIZED_FIELD_META,
  type HistorizedField
} from '@/lib/historized'
import { ageToBirthYear } from '@/lib/age'

type Form = {
  full_name: string
  birth_date: string
  age: string // количество лет, если дата рождения неизвестна
  notes_short: string
} & Record<HistorizedField, string>

const empty: Form = {
  full_name: '',
  birth_date: '',
  age: '',
  notes_short: '',
  phone: '',
  email: '',
  messenger: '',
  video_link: '',
  diagnosis: '',
  medications: '',
  doctor: ''
}

export function CreateClientDialog() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Form>(empty)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const create = useCreateClient()

  function reset() {
    setForm(empty)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.full_name.trim()) {
      setError(t('client.full_name_required'))
      return
    }
    const age = form.age.trim() === '' ? null : Number(form.age.trim())
    if (age !== null && (!Number.isInteger(age) || age < 0 || age > 120)) {
      setError(t('client.age_invalid'))
      return
    }
    try {
      const client = await create.mutateAsync({
        full_name: form.full_name.trim(),
        birth_date: form.birth_date || null,
        // Дата рождения приоритетнее: возраст сохраняем как год рождения
        // только если точной даты нет.
        birth_year: !form.birth_date && age !== null ? ageToBirthYear(age) : null,
        notes_short: form.notes_short.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        messenger: form.messenger.trim() || null,
        video_link: form.video_link.trim() || null,
        diagnosis: form.diagnosis.trim() || null,
        medications: form.medications.trim() || null,
        doctor: form.doctor.trim() || null
      })
      setOpen(false)
      reset()
      navigate(`/clients/${client.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          {t('clients.new')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('clients.new')}</DialogTitle>
          <DialogDescription>{t('client.create_description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="full_name">
                {t('client.full_name')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="full_name"
                autoFocus
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="birth_date">{t('client.birth_date')}</Label>
              <Input
                id="birth_date"
                type="date"
                value={form.birth_date}
                onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="age">
                {t('client.age_years')}{' '}
                <span className="font-normal text-muted-foreground">
                  {t('client.age_unknown_hint')}
                </span>
              </Label>
              <Input
                id="age"
                type="number"
                min={0}
                max={120}
                placeholder="34"
                value={form.age}
                disabled={Boolean(form.birth_date)}
                onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="notes_short">{t('client.notes_short')}</Label>
              <Input
                id="notes_short"
                value={form.notes_short}
                onChange={(e) => setForm((f) => ({ ...f, notes_short: e.target.value }))}
              />
            </div>

            {HISTORIZED_FIELDS.map((field) => {
              const meta = HISTORIZED_FIELD_META[field]
              return (
                <div
                  key={field}
                  className={meta.multiline ? 'col-span-2 space-y-1' : 'space-y-1'}
                >
                  <Label htmlFor={field}>{t(meta.label)}</Label>
                  {meta.multiline ? (
                    <Textarea
                      id={field}
                      placeholder={t(meta.placeholder)}
                      value={form[field]}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [field]: e.target.value }))
                      }
                    />
                  ) : (
                    <Input
                      id={field}
                      placeholder={t(meta.placeholder)}
                      value={form[field]}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [field]: e.target.value }))
                      }
                    />
                  )}
                </div>
              )
            })}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false)
                reset()
              }}
              disabled={create.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? t('client.creating') : t('common.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
