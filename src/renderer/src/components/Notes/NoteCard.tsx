/**
 * src/renderer/src/components/Notes/NoteCard.tsx
 *
 * Карточка заметки в правой нижней панели карточки клиента.
 * Цвет рендерится обводкой по всей границе + бейдж с подписью цвета.
 * Тело — preserve-line-breaks. На hover — кнопки редактирования и удаления.
 */
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { formatDateTime } from '@/lib/format'
import type { Note, NoteColor } from '@shared/types'

type Props = {
  note: Note
  color: NoteColor | null
  onEdit: () => void
  onDelete: () => void
}

export function NoteCard({ note, color, onEdit, onDelete }: Props) {
  const { t } = useTranslation()
  const accent = color?.hex ?? 'hsl(var(--muted))'
  return (
    <div
      className="group relative overflow-hidden rounded-lg border-2 bg-card px-3 py-2 shadow-sm transition-colors"
      style={{ borderColor: accent }}
    >
      <div className="flex items-start justify-between gap-2">
        {color && (
          <Badge
            variant="outline"
            className="border-0 text-[10px] uppercase tracking-wide"
            style={{ backgroundColor: accent + '33', color: accent }}
          >
            {color.label}
          </Badge>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 text-muted-foreground"
                onClick={onEdit}
                aria-label={t('common.edit')}
              >
                <Pencil className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('common.edit')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 text-muted-foreground hover:text-destructive"
                onClick={onDelete}
                aria-label={t('common.delete')}
              >
                <Trash2 className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('common.delete')}</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="mt-1 whitespace-pre-wrap text-sm">{note.body}</div>
      <div className="mt-1.5 text-[10px] text-muted-foreground">
        {formatDateTime(note.updated_at)}
      </div>
    </div>
  )
}
