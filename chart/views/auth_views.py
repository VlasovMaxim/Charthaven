import json

from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.views.decorators.http import require_POST

from ..forms import (
    RegisterForm,
    USERNAME_MIN_LENGTH,
    USERNAME_REGEX,
)


def register_view(request):
    if request.method == "POST":
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, "Регистрация прошла успешно! Вы вошли в систему.")
            return redirect("index")
    else:
        form = RegisterForm()
    return render(request, "chart/register.html", {"form": form})


@require_POST
def register_check_username(request):
    """Проверка логина при регистрации (JSON: {\"username\": \"...\"})."""
    try:
        payload = json.loads(request.body.decode("utf-8"))
        raw = (payload.get("username") or "")[:150]
    except (json.JSONDecodeError, TypeError, UnicodeDecodeError):
        return JsonResponse({"ok": False, "error": "invalid_json"}, status=400)
    raw = raw.strip()
    if not raw:
        return JsonResponse({"ok": True, "state": "empty", "message": ""})
    if len(raw) < USERNAME_MIN_LENGTH:
        return JsonResponse(
            {
                "ok": True,
                "state": "invalid",
                "message": f"Логин не короче {USERNAME_MIN_LENGTH} символов.",
            }
        )
    if not USERNAME_REGEX.match(raw):
        return JsonResponse(
            {
                "ok": True,
                "state": "invalid",
                "message": "Только латинские буквы, цифры и подчёркивание.",
            }
        )
    if User.objects.filter(username__iexact=raw).exists():
        return JsonResponse(
            {
                "ok": True,
                "state": "taken",
                "message": "Этот логин уже занят.",
            }
        )
    return JsonResponse({"ok": True, "state": "ok", "message": "Логин доступен."})


@require_POST
def register_validate_password(request):
    """Проверка пароля валидаторами Django (JSON: {\"password\": \"...\"})."""
    try:
        payload = json.loads(request.body.decode("utf-8"))
        pwd = (payload.get("password") or "")[:500]
    except (json.JSONDecodeError, TypeError, UnicodeDecodeError):
        return JsonResponse({"ok": False, "error": "invalid_json"}, status=400)
    if not pwd:
        return JsonResponse({"ok": True, "valid": None, "messages": []})
    try:
        validate_password(pwd, user=None)
        return JsonResponse({"ok": True, "valid": True, "messages": []})
    except ValidationError as e:
        return JsonResponse({"ok": True, "valid": False, "messages": list(e.messages)})


def login_view(request):
    if request.method == "POST":
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            return redirect("index")
        else:
            messages.error(request, "Неверные учетные данные")
    return render(request, "chart/login.html")


def logout_view(request):
    logout(request)
    return redirect("index")
