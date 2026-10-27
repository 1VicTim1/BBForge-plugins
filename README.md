# BBForge-plugins

Каталог плагинов для [BBForge](https://github.com/1VicTim1/BBForge). BBForge читает `index.json` из этого репозитория: «Настройки → Плагины и темы → Каталог».

| Плагин | Что делает | Разрешения |
| --- | --- | --- |
| `bbforge.profile-selector` — Выбор профиля форума | Список профилей форумов в строке состояния и точка расширения `bbforge.profile-selector.options` для других плагинов | `ui.add`, `ui.slots`, `profiles.select`, `commands` |
| `bbforge.selector-style` — Оформление выбора профиля | Акцентная метка вместо обычного списка, скрывает дублирующую надпись профиля | `styles`, `ui.modify` |
| `bbforge.forum-profiles` — Профили форумов | Профили XenForo 2, phpBB 3 и SMF 2.1 и пункт «Другие форумы…» в списке селектора | `profiles`, `ui.add`, `commands` |
| `bbforge.4pda-snippets` — Шаблоны 4PDA | Шаблон шапки темы, спойлеры «Скриншоты» и «Скачать»: команды, плитки в панели «Блоки», кнопка на панели | `commands`, `document.edit`, `ui.add` |

Первые три плагина показывают, как пакеты работают вместе: один добавляет селектор и объявляет точку расширения, второй его оформляет, третий наполняет профилями и пунктами.

## Устройство

```
packages/<папка>/   исходники пакета: manifest.json и файлы
dist/               подписанные архивы <id>-<version>.zip
index.json          каталог (bbforge-pack index)
build.sh            пересборка dist/ и index.json
```

## Как добавить или обновить плагин

1. Создайте или измените папку в `packages/` и поднимите `version` в манифесте.
2. Запустите `./build.sh`. Нужен `bbforge-pack` (`cargo install --path <BBForge>/crates/bbforge-pack`) и ключ подписи (`~/.config/bbforge/signing-key.json` или переменная `BBFORGE_SIGNING_KEY`).
3. Закоммитьте `packages/`, `dist/` и `index.json`.

Формат манифеста, разрешения и id элементов интерфейса описаны в [docs/plugins.md](https://github.com/1VicTim1/BBForge/blob/main/docs/plugins.md).
