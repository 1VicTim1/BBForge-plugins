# BBForge-plugins

Каталог плагинов для [BBForge](https://github.com/1VicTim1/BBForge). BBForge читает `index.json` из этого репозитория: «Настройки → Плагины и темы → Каталог».

| Плагин | Что делает | Разрешения |
| --- | --- | --- |
| `bbforge.profile-selector` — Выбор профиля форума | Оформленный список профилей в строке состояния («Автоматически» или конкретный форум) и точка расширения `bbforge.profile-selector.options` для других плагинов | `ui.add`, `ui.modify`, `ui.slots`, `profiles.select`, `commands`, `styles` |
| `bbforge.forum-profiles` — Профили форумов | Профили XenForo 2, phpBB 3 и SMF 2.1 с подсказками для автоопределения и пункт «Другие форумы…» в списке селектора | `profiles`, `ui.add`, `commands` |
| `bbforge.4pda-snippets` — Шаблоны 4PDA | Шапки тем: Android и iOS (программы, игры), устройства (обсуждение, покупка, аксессуары, брак и ремонт, прошивки), программы для ПК; меню «Шаблоны», палитра, плитки | `commands`, `document.edit`, `ui.add` |
| `bbforge.image-preview` — Предпросмотр картинок | Картинки из `[img]` в предпросмотре и миниатюры в конструкторе; загружает только с сайтов хранения картинок из своих разрешений | `scripts`, `network:4pda.to`, `network:imgur.com` и др. |
| `bbforge.dictionary-ru` — Русский словарь | Словарь Hunspell для проверки орфографии (LibreOffice, BSD) | `dictionaries` |
| `bbforge.dictionary-en` — Английский словарь | Словарь Hunspell, американский вариант (SCOWL) | `dictionaries` |
| `bbforge.languagetool` — LanguageTool | Грамматика, пунктуация и стиль через LanguageTool: бесплатный сервер, свой (в том числе `http://localhost:8081`) или Premium; синие подчёркивания и исправления по правому клику | `scripts`, `document.read`, `storage`, `commands`, `network:languagetool.org`, `network:languagetoolplus.com`, `network.custom` |
| `bbforge.code-check` — Проверка кода | Ошибки в `[code]`: JSON, XML, HTML, JavaScript (acorn); без сети | `scripts`, `document.read` |
| `bbforge.html-import` — Импорт HTML | Шапка, скопированная со страницы 4PDA, или HTML-код → BBCode: спойлеры, цитаты, код, списки, ссылки, картинки, цвета, размеры | `converters`, `commands`, `document.edit`, `ui.add` |

`profile-selector` и `forum-profiles` показывают, как пакеты работают вместе: первый добавляет селектор и объявляет точку расширения, второй наполняет его профилями и своим пунктом.

## Устройство

```
packages/<папка>/   исходники пакета: manifest.json и файлы
sources/code-check/ исходники проверки кода; build.sh собирает packages/code-check/main.js
dist/               подписанные архивы <id>-<version>.zip
index.json          каталог (bbforge-pack index)
build.sh            пересборка dist/ и index.json
```

## Как добавить или обновить плагин

1. Создайте или измените папку в `packages/` и поднимите `version` в манифесте.
2. Запустите `./build.sh`. Нужен `bbforge-pack` (`cargo install --path <BBForge>/crates/bbforge-pack`) и ключ подписи (`~/.config/bbforge/signing-key.json` или переменная `BBFORGE_SIGNING_KEY`).
3. Закоммитьте `packages/`, `dist/` и `index.json`.

Формат манифеста, разрешения и id элементов интерфейса описаны в [docs/plugins.md](https://github.com/1VicTim1/BBForge/blob/main/docs/plugins.md).

## Доверенные разработчики

`trusted-keys.json` — список ключей, пакеты с которыми BBForge ставит как доверенные. Список подписан корневым ключом, вшитым в BBForge (`trusted-keys.json.sig`); программа скачивает его при запуске, проверяет подпись и хранит последнюю проверенную копию. Изменить список без корневого ключа нельзя, даже с доступом к репозиторию.

Добавить разработчика или отозвать ключ:

1. Разработчик присылает открытый ключ: `bbforge-pack pubkey его-ключ.json`.
2. Добавьте его в `keys` (или открытый ключ в `revoked`) и увеличьте `serial`: список с меньшим `serial`, чем уже сохранённый у пользователя, BBForge не примет.
3. `bbforge-pack sign-keys trusted-keys.json --key ~/.config/bbforge/signing-key.json`
4. Закоммитьте `trusted-keys.json` и `trusted-keys.json.sig`.

Новый релиз BBForge для этого не нужен.
