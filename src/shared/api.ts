/**
 * src/shared/api.ts
 *
 * Контракт window.api — общий тип, который видят preload и renderer.
 * Преимущество: renderer не импортирует ничего из preload (там Node-код),
 * а получает только тип. Обе стороны согласованы.
 *
 * Дополняется при каждом новом IPC-домене.
 */
import type {
  Anamnesis,
  AnamnesisInput,
  AppInfo,
  Client,
  ClientCreateInput,
  ClientProfileUpdate,
  FieldRevision,
  MedicationPreset,
  MedicationPresetInput,
  Meeting,
  MeetingInput,
  MeetingProtocol,
  MeetingProtocolInput,
  Note,
  NoteColor,
  NoteColorInput,
  SearchEntity,
  SearchHit,
  TimelineEvent,
  TimelineQuery
} from './types'
import type { HistorizedField } from './historized'

export type AuthStatus = {
  initialized: boolean
  unlocked: boolean
}

export type SecurityFlags = {
  /** Файл соли — формата v1 (PBKDF2). После смены пароля БД мигрирует на Argon2id. */
  kdfNeedsUpgrade: boolean
  /** Открытый пароль короче текущего минимума длины. */
  weakPasswordDetected: boolean
}

export type EulaStatus = {
  acceptedVersion: number | null
}

export type Api = {
  app: {
    getInfo(): Promise<AppInfo>
    quit(): Promise<void>
  }
  eula: {
    status(): Promise<EulaStatus>
    accept(version: number): Promise<void>
  }
  auth: {
    getStatus(): Promise<AuthStatus>
    getSecurityFlags(): Promise<SecurityFlags>
    setupPassword(password: string): Promise<void>
    unlock(password: string): Promise<boolean>
    lock(): Promise<void>
    changePassword(oldPassword: string, newPassword: string): Promise<void>
  }
  clients: {
    list(opts?: { includeArchived?: boolean }): Promise<Client[]>
    get(id: number): Promise<Client>
    create(input: ClientCreateInput): Promise<Client>
    updateProfile(id: number, patch: ClientProfileUpdate): Promise<Client>
    updateField(
      id: number,
      field: HistorizedField,
      value: string | null,
      note?: string
    ): Promise<FieldRevision>
    archive(id: number): Promise<void>
    restore(id: number): Promise<void>
    purge(id: number): Promise<void>
    emptyTrash(): Promise<void>
  }
  revisions: {
    listByField(clientId: number, field: HistorizedField): Promise<FieldRevision[]>
    /**
     * Удаляет одну ревизию. Если она — самая свежая по своему полю,
     * `current_*` в clients пересчитывается на значение предыдущей
     * ревизии (или NULL, если ревизий по этому полю больше нет).
     */
    delete(id: number): Promise<void>
  }
  anamneses: {
    listByClient(clientId: number): Promise<Anamnesis[]>
    get(id: number): Promise<Anamnesis>
    create(clientId: number, input: AnamnesisInput): Promise<Anamnesis>
    update(id: number, patch: Partial<AnamnesisInput>): Promise<Anamnesis>
    delete(id: number): Promise<void>
  }
  meetings: {
    listByClient(clientId: number): Promise<Meeting[]>
    listInRange(from: string, to: string): Promise<Meeting[]>
    create(input: MeetingInput): Promise<Meeting>
    update(id: number, patch: Partial<MeetingInput>): Promise<Meeting>
    delete(id: number): Promise<void>
  }
  meetingProtocols: {
    getByMeeting(meetingId: number): Promise<MeetingProtocol | null>
    get(id: number): Promise<MeetingProtocol>
    /** Создаёт протокол; если для встречи уже есть — кидает ошибку. */
    create(meetingId: number, input: MeetingProtocolInput): Promise<MeetingProtocol>
    /** Идемпотентный апсерт: создаст или обновит протокол для данной встречи. */
    upsertByMeeting(
      meetingId: number,
      input: MeetingProtocolInput
    ): Promise<MeetingProtocol>
    update(id: number, patch: MeetingProtocolInput): Promise<MeetingProtocol>
    delete(id: number): Promise<void>
  }
  notes: {
    listByClient(clientId: number): Promise<Note[]>
    create(input: {
      client_id: number
      color_id: number | null
      body: string
    }): Promise<Note>
    update(
      id: number,
      patch: { color_id?: number | null; body?: string }
    ): Promise<Note>
    delete(id: number): Promise<void>
  }
  medicationPresets: {
    list(): Promise<MedicationPreset[]>
    create(input: MedicationPresetInput): Promise<MedicationPreset>
    update(id: number, patch: Partial<MedicationPresetInput>): Promise<MedicationPreset>
    delete(id: number): Promise<void>
    reorder(ids: number[]): Promise<void>
  }
  colors: {
    list(): Promise<NoteColor[]>
    create(input: NoteColorInput): Promise<NoteColor>
    update(
      id: number,
      patch: Partial<NoteColorInput>
    ): Promise<NoteColor>
    /** Сколько заметок используют этот цвет (для UI: показывать ли диалог замены). */
    usageCount(id: number): Promise<number>
    /**
     * Удалить цвет. Если есть заметки с этим цветом — сначала переносим их
     * на toId (или снимаем цвет, если toId=null), потом удаляем. Всё в одной
     * транзакции в main.
     */
    replaceAndDelete(fromId: number, toId: number | null): Promise<void>
    /** Изменить порядок цветов: id'ы в нужном порядке. */
    reorder(ids: number[]): Promise<void>
  }
  timeline: {
    byClient(clientId: number, query?: TimelineQuery): Promise<TimelineEvent[]>
  }
  search: {
    query(
      q: string,
      opts?: { entities?: SearchEntity[]; limit?: number }
    ): Promise<SearchHit[]>
  }
  settings: {
    get(key: string): Promise<unknown>
    set(key: string, value: unknown): Promise<void>
  }
  backup: {
    list(): Promise<BackupInfo[]>
    createNow(): Promise<BackupInfo>
    delete(path: string): Promise<void>
    /**
     * Восстановить БД из бэкапа: main закрывает БД, подменяет файлы и
     * перезапускает приложение. Promise может не успеть зарезолвиться.
     */
    restore(path: string): Promise<void>
    /** Возвращает путь, куда пользователь сохранил JSON, либо null если отменил. */
    exportJson(): Promise<string | null>
  }
}

export type BackupInfo = {
  path: string
  createdAt: string
  size: number
}
