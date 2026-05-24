from django.db import models
from django.contrib.auth.models import User

# Модель профиля пользователя (личный кабинет)
class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    avatar = models.BinaryField(null=True, blank=True)  # Аватарка хранится в БД (бинарно)
    updated_at = models.DateTimeField(auto_now=True)
    # Тема интерфейса (светлая / тёмная) — сохраняется для пользователя
    ui_theme = models.CharField(
        max_length=8,
        default="light",
        choices=[("light", "Светлая"), ("dark", "Тёмная")],
    )
    # Поля из миграции 0002 (смена e‑mail больше не используется в UI, колонки могут остаться в БД)
    email_confirmation_code = models.CharField(max_length=6, blank=True, null=True)
    pending_email = models.EmailField(blank=True, null=True)

    def __str__(self):
        return f"Профиль {self.user.username}"

# Модель загруженного пользователем файла
class UploadedFile(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True, blank=True
    )
    # Для неавторизованных: привязка к сессии Django (тот же браузер)
    session_key = models.CharField(
        max_length=40, null=True, blank=True, db_index=True
    )
    filename = models.CharField(max_length=255)
    data = models.BinaryField()  # Файл хранится в БД (бинарно)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        if self.user_id:
            return f"Файл {self.filename} ({self.user.username})"
        return f"Файл {self.filename} (гость)"

# Модель сохранённого графика
class SavedChart(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    uploaded_file = models.ForeignKey(UploadedFile, on_delete=models.CASCADE)
    chart_type = models.CharField(max_length=100)  # тип: line, bar, pie и т.д.
    data_json = models.JSONField()    # данные для графика (можно исключить, если генерируются из файла)
    layout_json = models.JSONField()  # оформление графика (оси, подписи, цвет и т.д.)
    preview_html = models.TextField(default="")  # пустая строка для уже существующих записей
    columns_json = models.JSONField(default=list)  # пустой список по умолчанию
    settings_json = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"График {self.chart_type} от {self.user.username}"
