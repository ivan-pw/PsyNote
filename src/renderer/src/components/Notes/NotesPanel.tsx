/**
 * src/renderer/src/components/Notes/NotesPanel.tsx
 *
 * Правая нижняя панель карточки клиента (plan §6.3).
 * Список цветных карточек заметок + кнопка «Новая заметка».
 *
 * Поведение по кнопкам карточки:
 *  - Редактировать → открыть NoteDialog в режиме edit;
 *  - Удалить → также открыть NoteDialog в режиме edit. Удаление выполняется
 *    только внутри диалога через ConfirmDestructiveDialog (ввод слова),
 *    чтобы инвариант «единый путь для destructive-действия» соблюдался.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, StickyNote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNotesByClient } from '@/hooks/useNotes'
import { useColors, colorById } from '@/hooks/useColors'
import { NoteCard } from './NoteCard'
import { NoteDialog, type NoteDialogState } from './NoteDialog'

type Props = {
  clientId: number
}

export function NotesPanel({ clientId }: Props) {
  const { t } = useTranslation()
  const { data: notes, isLoading } = useNotesByClient(clientId)
  const { data: colors } = useColors()
  const [dialog, setDialog] = useState<NoteDialogState | null>(null)

  return (
    <div className="flex min-h-0 flex-col rounded-lg border bg-card/40 p-3 text-card-foreground">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <StickyNote className="size-4 text-muted-foreground" />
          {t('notes.title')}
        </div>
        <Button size="sm" variant="outline" onClick={() => setDialog({ mode: 'create' })}>
          <Plus className="size-4" />
          {t('notes.new')}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('app.loading')}</p>
      ) : !notes || notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('notes.empty')}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              color={colorById(colors, n.color_id)}
              onEdit={() => setDialog({ mode: 'edit', note: n })}
              onDelete={() => setDialog({ mode: 'edit', note: n })}
            />
          ))}
        </div>
      )}

      <NoteDialog
        open={dialog !== null}
        clientId={clientId}
        state={dialog}
        onClose={() => setDialog(null)}
      />
    </div>
  )
}
