-- 008_age_doctor.sql
-- 1) birth_year: возможность указать только возраст (хранится год рождения,
--    чтобы значение не «протухало» со временем). birth_date остаётся приоритетным.
-- 2) current_doctor: новое историзируемое поле «Врач» (кэш последней ревизии,
--    как и остальные current_*).

ALTER TABLE clients ADD COLUMN birth_year INTEGER;
ALTER TABLE clients ADD COLUMN current_doctor TEXT;
