# ChartHaven

Веб-приложение для визуализации табличных данных (дипломный проект).

ChartHaven позволяет загрузить CSV/Excel, получить предпросмотр данных, настроить диаграмму, построить ее интерактивно в браузере и экспортировать в PNG/SVG/JPEG. Для авторизованных пользователей доступно сохранение графиков в личную коллекцию с повторной загрузкой, поиском, сортировкой, группировкой и удалением.

Репозиторий: [github.com/VlasovMaxim/Charthaven](https://github.com/VlasovMaxim/Charthaven)

## Основные возможности

- Загрузка файлов `.csv`, `.xlsx`, `.xls` с drag-and-drop.
- Поддерживаемые типы диаграмм: `line`, `bar`, `pie`, `hist`, `scatter`, `area`.
- Гибкие настройки: оси, заголовок, подписи, цвета, стиль/толщина линии, число корзин гистограммы, сетка, легенда, фон, шрифты.
- Автоматическая перестройка графика при изменении настроек.
- Экспорт графика с учетом выбранной темы интерфейса.
- Светлая и темная тема: для гостя хранится в `localStorage`, для авторизованного синхронизируется с профилем.
- Аккаунт пользователя: регистрация, вход/выход, личный кабинет, аватар, смена пароля.
- Сохраненные графики: восстановление полного контекста (данные/настройки) и повторное редактирование.

## Как устроено приложение

### Роли

- Гость: загрузка файла, предпросмотр, построение и экспорт графика в пределах текущей сессии.
- Авторизованный пользователь: все возможности гостя + сохранение графиков, вкладка "Созданные графики", серверное хранение темы.

### Архитектура

- Backend: Django (`chartHaven`, приложение `chart`).
- Построение графика: pandas + Plotly Python на сервере.
- Отрисовка: Plotly.js на клиенте.
- Хранение: MySQL (основной профиль), SQLite in-memory для тестов.

Типовой поток:
1. Клиент загружает файл на `POST /upload/`.
2. Сервер сохраняет `UploadedFile` и возвращает `uploadedFileId`, `columns`, `preview_data`.
3. Клиент отправляет параметры в `POST /create_chart/`.
4. Сервер формирует `graphData` + `layout`, при необходимости сохраняет в `SavedChart`.
5. Клиент рендерит график через Plotly.js.

## Стек технологий

- Python, Django
- pandas, numpy, plotly, openpyxl
- HTML, CSS, JavaScript (vanilla)
- MySQL (dev/prod), SQLite (tests)
- Pillow, python-dotenv

Зависимости: `requirements.txt`.

Примечание: для MySQL нужен драйвер (`mysqlclient` или `PyMySQL` с дополнительной настройкой).

## Структура проекта

```text
charthaven/
├── manage.py
├── requirements.txt
├── chartHaven/
│   ├── settings.py
│   ├── settings_test.py
│   └── urls.py
└── chart/
    ├── models.py
    ├── forms.py
    ├── urls.py
    ├── views/
    │   ├── charts.py
    │   ├── auth_views.py
    │   ├── profile_views.py
    │   ├── api.py
    │   └── helpers.py
    ├── templates/chart/
    ├── static/chart/
    │   ├── css/
    │   ├── js/
    │   └── images/
    └── tests/
```

## Модель данных

Ключевые сущности:

- `User` (`auth_user`) - стандартная модель Django.
- `Profile` (`chart_profile`) - профиль пользователя (аватар, `ui_theme`).
- `UploadedFile` (`chart_uploadedfile`) - бинарное содержимое загруженного файла, связанное с пользователем или сессией гостя.
- `SavedChart` (`chart_savedchart`) - сохраненный график (`data_json`, `layout_json`, `settings_json`, `preview_html`, `columns_json`).

Связи:

- `User 1:1 Profile`
- `User 1:* UploadedFile` (для гостя `user_id = NULL`, используется `session_key`)
- `User 1:* SavedChart`
- `UploadedFile 1:* SavedChart`

## Установка и запуск

```bash
git clone https://github.com/VlasovMaxim/Charthaven.git
cd charthaven
python -m venv .venv
```

Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

Linux/macOS:

```bash
source .venv/bin/activate
```

Установка зависимостей:

```bash
pip install -r requirements.txt
pip install mysqlclient
```

Настройте базу данных в `chartHaven/settings.py` (рекомендуется вынести секреты в `.env`), затем:

```bash
python manage.py migrate
python manage.py runserver
```

Приложение: `http://127.0.0.1:8000/`

## API и маршруты

Основные endpoint'ы:

- `GET /` - главная страница.
- `POST /upload/` - загрузка CSV/Excel, возврат preview и списка колонок.
- `POST /create_chart/` - построение графика по параметрам.
- `GET /api/saved-charts/` - список сохраненных графиков пользователя.
- `GET /api/saved-charts/<id>/` - получить сохраненный график.
- `DELETE /api/saved-charts/<id>/` - удалить сохраненный график.
- `POST /api/user-theme/` - сохранить тему (`light`/`dark`) для авторизованного пользователя.

Также доступны страницы и проверки для авторизации/профиля:

- `/register/`, `/login/`, `/logout/`, `/profile/`
- `/register/check-username/`
- `/register/validate-password/`
- `/profile/verify-password/`
- `/profile/check-username/`

## Тестирование

Запуск тестов с тестовыми настройками (SQLite in-memory):

```bash
python manage.py test chart.tests --settings=chartHaven.settings_test
```

Покрыты базовые сценарии:

- доступность главной страницы;
- CSRF-проверки для `upload` и `create_chart`;
- гостевая загрузка CSV;
- построение графика после загрузки.

## Безопасность и эксплуатация

- Для POST-запросов включен CSRF.
- Доступ к данным гостя ограничен его `session_key`.
- Сохраненные графики доступны только владельцу.
- Пароли хранятся в виде хэшей Django.
- Для продакшена обязательно: `DEBUG=False`, корректный `ALLOWED_HOSTS`, HTTPS, секреты и учетные данные в переменных окружения.

## Документы для диплома

В репозитории есть материалы для главы 2 и 3:

- `Интерфейс_и_функционал_веб-приложения.txt`
- `Описание_проекта_для_диплома_главы_2_3.txt`
- `Структура_базы_данных_для_ER_диаграммы.txt`

## Лицензия

MIT, см. `LICENSE`.
