"""
Настройки для `python manage.py test --settings=chartHaven.settings_test`.
SQLite в памяти — без MySQL на машине CI/разработчика.
"""
from .settings import *  # noqa: F401,F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}
