/**
 * src/renderer/src/components/ClientFields/PermanentFieldsPanel.tsx
 *
 * Панель «Информация о клиенте» в сайдбаре карточки клиента.
 *
 * Незаполненные поля скрываются, чтобы не шуметь прочерками; добавить
 * значение можно через «+ Добавить поле» — выбранное поле появляется сразу
 * в режиме редактирования, а при отмене без значения снова прячется.
 *
 * Анамнезы здесь не отображаются — только кнопка «+ Новый анамнез».
 * Сами карточки видны в истории изменений (раскрываются по клику).
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cake, FilePlus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { EditableField } from './EditableField'
import { MedicationsField } from './MedicationsField'
import { BirthInfoField } from './BirthInfoField'
import { HISTORIZED_FIELDS, HISTORIZED_FIELD_META } from '@/lib/historized'
import { clientAge } from '@/lib/age'
import type { Client } from '@shared/types'
import type { HistorizedField } from '@shared/historized'

const currentKeyMap: Record<HistorizedField, keyof Client> = {
  phone: 'current_phone',
  email: 'current_email',
  messenger: 'current_messenger',
  video_link: 'current_video_link',
  diagnosis: 'current_diagnosis',
  medications: 'current_medications',
  doctor: 'current_doctor'
}

// Порядок отображения — как в макете (plan §6.3) + «Врач».
const DISPLAY_ORDER: HistorizedField[] = [
  'diagnosis',
  'medications',
  'doctor',
  'messenger',
  'phone',
  'email',
  'video_link'
]

// «birth» — псевдо-поле возраста/даты рождения (не историзируется).
type PanelField = HistorizedField | 'birth'

type Props = {
  client: Client
  onAddAnamnesis?: () => void
}

export function PermanentFieldsPanel({ client, onAddAnamnesis }: Props) {
  const { t } = useTranslation()
  // Поля, добавленные через «+ Добавить поле», но ещё пустые.
  const [revealed, setRevealed] = useState<Set<PanelField>>(new Set())
  const [pickerOpen, setPickerOpen] = useState(false)

  const hasBirth = clientAge(client.birth_date, client.birth_year) !== null

  const valueOf = (field: HistorizedField): string | null =>
    (client[currentKeyMap[field]] as string | null) ?? null

  const visible = (field: PanelField): boolean =>
    revealed.has(field) ||
    (field === 'birth' ? hasBirth : valueOf(field) !== null)

  const hidden: PanelField[] = (['birth', ...DISPLAY_ORDER] as PanelField[]).filter(
    (f) => !visible(f)
  )

  function reveal(field: PanelField) {
    setRevealed((prev) => new Set(prev).add(field))
    setPickerOpen(false)
  }

  function dismiss(field: PanelField) {
    setRevealed((prev) => {
      const next = new Set(prev)
      next.delete(field)
      return next
    })
  }

  return (
    <div className="rounded-lg border bg-card p-3 text-card-foreground">
      <div className="divide-y">
        {visible('birth') && (
          <BirthInfoField
            client={client}
            defaultEditing={revealed.has('birth') && !hasBirth}
            onDismissEmpty={() => dismiss('birth')}
          />
        )}
        {DISPLAY_ORDER.map((field) => {
          if (!HISTORIZED_FIELDS.includes(field) || !visible(field)) return null
          const value = valueOf(field)
          // Медикаменты — multi-select с автодополнением, остальные поля —
          // обычный текстовый редактор.
          if (field === 'medications') {
            return (
              <MedicationsField key={field} clientId={client.id} value={value} />
            )
          }
          return (
            <EditableField
              key={field}
              clientId={client.id}
              field={field}
              value={value}
              defaultEditing={revealed.has(field) && value === null}
              onDismissEmpty={() => dismiss(field)}
            />
          )
        })}
        {!visible('birth') && !DISPLAY_ORDER.some(visible) && (
          <p className="px-2 py-1.5 text-sm italic text-muted-foreground">
            {t('client.empty_fields')}
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2 border-t pt-3">
        {hidden.length > 0 && (
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
                <Plus className="size-4" />
                {t('client.add_field')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1" align="start">
              {hidden.map((field) => {
                const meta =
                  field === 'birth'
                    ? { label: 'client.age_birth_field', icon: Cake }
                    : HISTORIZED_FIELD_META[field]
                const Icon = meta.icon
                return (
                  <button
                    key={field}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => reveal(field)}
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    {t(meta.label)}
                  </button>
                )
              })}
            </PopoverContent>
          </Popover>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onAddAnamnesis}
          disabled={!onAddAnamnesis}
        >
          <FilePlus className="size-4" />
          {t('anamnesis.new')}
        </Button>
      </div>
    </div>
  )
}
