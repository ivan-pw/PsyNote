/**
 * src/renderer/src/lib/historized.ts
 *
 * Метаинформация об историзируемых полях клиента — для UI:
 *  - label  — i18n-ключ подписи в карточке клиента (рендерить через t(meta.label));
 *  - icon   — иконка lucide-react (используется в PermanentFields);
 *  - parseExternal — превращение значения поля в URL для shell.openExternal:
 *    мессенджер и видео-ссылка — кликабельны (см. plan.md §6.3),
 *    email/phone — открываются как mailto/tel в системном приложении.
 *
 * Сами имена полей и их whitelist живут в @shared/historized, чтобы main
 * и renderer ссылались на один источник.
 */
import {
  HISTORIZED_FIELDS,
  isHistorizedField,
  type HistorizedField
} from '@shared/historized'
import {
  BriefcaseMedical,
  Mail,
  MessageCircle,
  Phone,
  Pill,
  Stethoscope,
  Video,
  type LucideIcon
} from 'lucide-react'

export type HistorizedFieldMeta = {
  /** i18n-ключ подписи поля (рендерить через t(meta.label)). */
  label: string
  icon: LucideIcon
  /** i18n-ключ плейсхолдера (рендерить через t(meta.placeholder)). */
  placeholder: string
  multiline?: boolean
}

export const HISTORIZED_FIELD_META: Record<HistorizedField, HistorizedFieldMeta> = {
  phone: { label: 'fields.phone', icon: Phone, placeholder: 'fields.placeholder.phone' },
  email: { label: 'fields.email', icon: Mail, placeholder: 'fields.placeholder.email' },
  messenger: {
    label: 'fields.messenger',
    icon: MessageCircle,
    placeholder: 'fields.placeholder.messenger'
  },
  video_link: {
    label: 'fields.video_link',
    icon: Video,
    placeholder: 'fields.placeholder.video_link'
  },
  diagnosis: {
    label: 'fields.diagnosis',
    icon: Stethoscope,
    placeholder: 'fields.placeholder.diagnosis',
    multiline: true
  },
  medications: {
    label: 'fields.medications',
    icon: Pill,
    placeholder: 'fields.placeholder.medications',
    multiline: true
  },
  doctor: {
    label: 'fields.doctor',
    icon: BriefcaseMedical,
    placeholder: 'fields.placeholder.doctor',
    multiline: true
  }
}

export { HISTORIZED_FIELDS, isHistorizedField }
export type { HistorizedField }

/**
 * Парсит значение поля и пытается превратить его в кликабельный URL.
 * Возвращает null, если ссылку построить не получилось.
 */
export function parseExternalUrl(field: HistorizedField, value: string): string | null {
  const v = value.trim()
  if (!v) return null

  if (/^https?:\/\//i.test(v)) return v

  if (field === 'phone') {
    const digits = v.replace(/[^\d+]/g, '')
    if (digits) return `tel:${digits}`
    return null
  }

  if (field === 'email') {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? `mailto:${v}` : null
  }

  if (field === 'messenger') {
    const tg = v.match(/^(?:telegram|tg)\s*[:\s]\s*@?([\w_]+)/i)
    if (tg?.[1]) return `https://t.me/${tg[1]}`
    const wa = v.match(/^(?:whatsapp|wa)\s*[:\s]\s*\+?([\d-]+)/i)
    if (wa?.[1]) return `https://wa.me/${wa[1].replace(/-/g, '')}`
    return null
  }

  return null
}
