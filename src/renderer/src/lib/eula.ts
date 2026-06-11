/**
 * src/renderer/src/lib/eula.ts
 *
 * Версия и текст пользовательского соглашения.
 *
 * Версия — целое число; при значимом обновлении текста инкрементируем,
 * и пользователь увидит диалог снова. Принятие хранится в plain-файле
 * `userData/eula.json` (IPC `eula:*`) — НЕ в зашифрованных settings,
 * потому что соглашение показывается до создания/разблокировки БД.
 *
 * v6: гейт перенесён до unlock + показывается полный текст LICENSE
 * (краткая выжимка сверху, юридический текст ниже).
 *
 * Текст специально короткий, но содержит ключевые пункты:
 *   1) ПО предоставляется «как есть», без гарантий;
 *   2) разработчик не несёт ответственности за использование;
 *   3) разработчик не получает и не хранит данные пользователя;
 *   4) сохранность персональных и иных данных — на пользователе;
 *   5) лицензия PolyForm Small Business 1.0.0 + дополнительное
 *      ограничение: бесплатно при ≤ 1 человека в штате и ≤ $30 000
 *      годовой выручки; всё, что выше, — по отдельному соглашению.
 *
 * Форматирование: только реальные абзацы разделены `\n` (CSS
 * `whitespace-pre-line` превращает их в визуальные переносы), внутри
 * параграфа — одна сплошная строка, ширину держит сам контейнер.
 */
// Полный текст лицензии (репозиторный LICENSE) — Vite инлайнит его в бандл,
// поэтому в дистрибутиве текст доступен всегда, независимо от упаковки файлов.
import LICENSE_FULL_TEXT from '../../../../LICENSE?raw'

export { LICENSE_FULL_TEXT }

export const CURRENT_EULA_VERSION = 6

export const EULA_TEXT_RU = `Пользовательское соглашение PsyNote

1. ПО «как есть».
Программа PsyNote предоставляется на условиях «как есть» (as-is), без явных или подразумеваемых гарантий — включая, но не ограничиваясь, гарантии пригодности для определённой цели, отсутствия ошибок, сохранности данных и непрерывности работы.

2. Отсутствие ответственности разработчика.
Разработчик не несёт ответственности за любые прямые, косвенные, случайные или последующие убытки, возникшие в результате использования или невозможности использования программы. Использование программы — на ваш страх и риск.

3. Данные хранятся локально.
Программа работает полностью локально на вашем устройстве. Разработчик не получает, не хранит и не передаёт никакие данные клиентов, заметки, анамнезы, встречи или иные сведения, которые вы вводите в программу.

4. Ответственность за сохранность данных.
Вся ответственность за сохранность, конфиденциальность и резервное копирование персональных, медицинских и любых иных данных, обрабатываемых с использованием программы, лежит на конечном пользователе. В частности — выбор надёжного пароля, регулярные резервные копии, безопасное хранение экспортов и устройств, на которых установлена программа.

5. Лицензия.
Программа распространяется по лицензии PolyForm Small Business 1.0.0 с дополнительным ограничением, сужающим пороги секции «Permitted Purposes» базовой лицензии до индивидуального применения.

Бесплатное использование возможно только при ОДНОВРЕМЕННОМ выполнении обоих условий:
• штат пользователя — не более 1 (одного) человека: суммарно сотрудники и независимые подрядчики организации в течение календарного года;
• годовая выручка пользователя — не более 30 000 долларов США (или эквивалент в другой валюте) за календарный год, от любых источников, перечисленных в базовой лицензии (продажи, услуги, пожертвования, инвестиции, займы, продажа самого ПО).

Под эти пороги естественным образом попадают: личное, учебное, исследовательское и любительское использование, а также небольшая частная практика одного специалиста (ИП / самозанятый), пока её годовая выручка остаётся ниже указанного порога.

Любое использование, не удовлетворяющее обоим условиям, требует отдельной письменной лицензии от правообладателя. Пробного периода базовая лицензия не предусматривает.

Полный текст лицензии и ограничения — в файле LICENSE. Канонический текст базовой лицензии — на https://polyformproject.org/licenses/small-business/1.0.0/.

Нажимая «Принимаю», вы подтверждаете, что прочитали условия и согласны с ними.`

export const EULA_TEXT_EN = `PsyNote — End User License Agreement

1. As-is software.
PsyNote is provided "as is", without any express or implied warranty — including but not limited to fitness for a particular purpose, freedom from errors, data integrity, or uninterrupted operation.

2. No developer liability.
The developer is not liable for any direct, indirect, incidental, or consequential damages arising from the use of or inability to use the software. Use is at your own risk.

3. Data stays local.
The application runs entirely on your device. The developer does not receive, store, or transmit any client records, notes, anamneses, meetings, or other data you enter into the application.

4. Data safety is yours.
You are solely responsible for the safety, confidentiality, and backups of personal, medical, and any other data processed with the application — including choosing a strong password, taking regular backups, and securing exports and the devices on which the application is installed.

5. License.
The application is distributed under the PolyForm Small Business License 1.0.0 with an additional restriction narrowing the "Permitted Purposes" thresholds to individual use.

Free use is permitted only when BOTH of the following conditions are met:
• the user's total staff — combined employees and independent contractors during a calendar year — does NOT exceed ONE (1) person;
• the user's annual revenue does NOT exceed THIRTY THOUSAND US DOLLARS (USD 30,000), or the equivalent in any other currency, per calendar year, from any of the sources listed in the base license (product sales, service fees, donations, investments, loans, or revenue from selling the software itself).

These thresholds naturally cover personal, educational, research, and hobby use, as well as solo private practice (a sole proprietor / self-employed practitioner), as long as the annual revenue stays below the threshold.

Any use that fails either condition requires a separate written license from the rights holder. The base license does not provide a trial period.

See the LICENSE file for the full license text and the Additional Restriction. The canonical text of the base license is at https://polyformproject.org/licenses/small-business/1.0.0/.

By clicking "Accept", you confirm that you have read and agree to these terms.`
