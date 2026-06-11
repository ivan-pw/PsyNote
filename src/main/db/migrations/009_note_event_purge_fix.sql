-- 009_note_event_purge_fix.sql
-- Багфикс: полное удаление клиента (purge) падало с "FOREIGN KEY constraint
-- failed", если у клиента были заметки. Каскад DELETE clients → DELETE notes
-- запускал триггер notes_ad_event, который вставлял событие со ссылкой на
-- уже удаляемого клиента.
--
-- Решение: триггер пишет событие удаления только если клиент ещё существует
-- (обычное удаление одной заметки). При purge клиента события не нужны —
-- его note_events и так удаляются каскадом.

DROP TRIGGER IF EXISTS notes_ad_event;

CREATE TRIGGER notes_ad_event AFTER DELETE ON notes
WHEN EXISTS (SELECT 1 FROM clients WHERE id = old.client_id)
BEGIN
  INSERT INTO note_events (client_id, note_id, action, body, color_id, at)
  VALUES (
    old.client_id, old.id, 'delete', old.body, old.color_id,
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  );
END;
