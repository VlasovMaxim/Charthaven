import json

from django.contrib import messages
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.views.decorators.http import require_POST

from ..forms import (
    PasswordChangeFormRu,
    ProfileForm,
    UserForm,
    USERNAME_MIN_LENGTH,
    USERNAME_REGEX,
)


@login_required
def profile_view(request):
    user = request.user

    if request.method == "POST":
        if "save_profile" in request.POST:
            uform = UserForm(request.POST, instance=user)
            pform = ProfileForm(request.POST, request.FILES)
            pass_form = PasswordChangeFormRu(user=user)
            if uform.is_valid() and pform.is_valid():
                uform.save()
                pform.save(user)
                messages.success(request, "Профиль обновлён.")
                return redirect("profile")
        elif "change_password" in request.POST:
            uform = UserForm(instance=user)
            pform = ProfileForm()
            pass_form = PasswordChangeFormRu(user=user, data=request.POST)
            if pass_form.is_valid():
                pass_form.save()
                update_session_auth_hash(request, user)
                messages.success(request, "Пароль изменён.")
                return redirect("profile")
        else:
            uform = UserForm(instance=user)
            pform = ProfileForm()
            pass_form = PasswordChangeFormRu(user=user)
    else:
        uform = UserForm(instance=user)
        pform = ProfileForm()
        pass_form = PasswordChangeFormRu(user=user)

    return render(
        request,
        "chart/profile.html",
        {
            "uform": uform,
            "pform": pform,
            "pass_form": pass_form,
        },
    )


@login_required
@require_POST
def verify_current_password(request):
    """Проверка текущего пароля для подсказок в форме (JSON: {\"password\": \"...\"})."""
    try:
        payload = json.loads(request.body.decode("utf-8"))
        pwd = (payload.get("password") or "")[:500]
    except (json.JSONDecodeError, TypeError, UnicodeDecodeError):
        return JsonResponse({"ok": False, "error": "invalid_json"}, status=400)
    if not pwd:
        return JsonResponse({"ok": False})
    return JsonResponse({"ok": request.user.check_password(pwd)})


@login_required
@require_POST
def profile_check_username(request):
    """Проверка логина в личном кабинете (JSON: {\"username\": \"...\"})."""
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
    if raw.casefold() == request.user.username.casefold():
        return JsonResponse(
            {
                "ok": True,
                "state": "current",
                "message": "Текущий логин.",
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


@login_required
@require_POST
def save_user_ui_theme(request):
    """Сохранить тему интерфейса (light/dark) в профиле пользователя."""
    try:
        payload = json.loads(request.body.decode("utf-8"))
        theme = payload.get("theme")
        if theme not in ("light", "dark"):
            return JsonResponse({"ok": False, "error": "invalid_theme"}, status=400)
        profile = request.user.profile
        profile.ui_theme = theme
        profile.save(update_fields=["ui_theme"])
        return JsonResponse({"ok": True})
    except (json.JSONDecodeError, UnicodeDecodeError, AttributeError, ValueError):
        return JsonResponse({"ok": False}, status=400)
