# chart/forms.py
from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm, PasswordChangeForm
import re
from .models import Profile

USERNAME_REGEX = re.compile(r"^[A-Za-z0-9_]+$")
USERNAME_MIN_LENGTH = 5


class RegisterForm(UserCreationForm):
    class Meta:
        model = User
        fields = ["username", "password1", "password2"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["username"].label = "Логин"
        self.fields["password1"].label = "Пароль"
        self.fields["password2"].label = "Подтверждение пароля"
        self.fields["password1"].help_text = (
            "Не короче 8 символов. Избегайте слишком простых паролей."
        )
        self.fields["password2"].help_text = ""
        self.fields["username"].help_text = (
            f"Не короче {USERNAME_MIN_LENGTH} символов. Только латинские буквы, цифры и подчёркивание."
        )

    def clean_username(self):
        username = self.cleaned_data["username"]
        if len(username) < USERNAME_MIN_LENGTH:
            raise forms.ValidationError(
                f"Логин должен быть не короче {USERNAME_MIN_LENGTH} символов."
            )
        if not USERNAME_REGEX.match(username):
            raise forms.ValidationError(
                "Логин может содержать только латинские буквы, цифры и подчёркивание."
            )
        if User.objects.filter(username__iexact=username).exists():
            raise forms.ValidationError("Этот логин уже занят.")
        return username

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = ""
        if commit:
            user.save()
            if hasattr(self, "save_m2m"):
                self.save_m2m()
        return user


class UserForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ["username"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["username"].label = "Логин"
        self.fields["username"].help_text = (
            f"Не короче {USERNAME_MIN_LENGTH} символов. Только латиница, цифры и _."
        )

    def clean_username(self):
        username = self.cleaned_data["username"]
        if len(username) < USERNAME_MIN_LENGTH:
            raise forms.ValidationError(
                f"Логин должен быть не короче {USERNAME_MIN_LENGTH} символов."
            )
        if not USERNAME_REGEX.match(username):
            raise forms.ValidationError(
                "Логин может содержать только латинские буквы, цифры и подчёркивание."
            )
        if User.objects.filter(username__iexact=username).exclude(pk=self.instance.pk).exists():
            raise forms.ValidationError("Этот логин уже занят.")
        return username


class PasswordChangeFormRu(PasswordChangeForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["old_password"].label = "Текущий пароль"
        self.fields["new_password1"].label = "Новый пароль"
        self.fields["new_password2"].label = "Подтверждение нового пароля"
        self.fields["new_password2"].help_text = ""
        for name in ("old_password", "new_password1", "new_password2"):
            self.fields[name].widget.attrs.setdefault(
                "class", "profile-password-input"
            )


class ProfileForm(forms.Form):
    avatar = forms.FileField(
        required=False,
        label="Новая аватарка",
        help_text="PNG, JPG или GIF",
    )

    def save(self, user):
        avatar_file = self.cleaned_data.get("avatar")
        if avatar_file:
            profile = user.profile
            profile.avatar = avatar_file.read()
            profile.save()
