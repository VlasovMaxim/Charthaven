# chart/forms.py
from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm
import re
from .models import Profile

USERNAME_REGEX = re.compile(r'^[A-Za-z0-9_]+$')

class RegisterForm(UserCreationForm):
    email = forms.EmailField()

    class Meta:
        model = User
        fields = ['username', 'email', 'password1', 'password2']

    def clean_email(self):
        email = self.cleaned_data['email']
        if User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError("Пользователь с таким e‑mail уже зарегистрирован.")
        return email

    def clean_username(self):
        username = self.cleaned_data['username']
        if not USERNAME_REGEX.match(username):
            raise forms.ValidationError(
                "Логин может содержать только латинские буквы, цифры и подчёркивание."
            )
        if User.objects.filter(username__iexact=username).exists():
            raise forms.ValidationError("Этот логин уже занят.")
        return username

class UserForm(forms.ModelForm):
    class Meta:
        model  = User
        fields = ['username', 'email']

    def clean_email(self):
        email = self.cleaned_data['email'].lower()
        # исключаем текущего пользователя при проверке
        if User.objects.filter(email__iexact=email).exclude(pk=self.instance.pk).exists():
            raise forms.ValidationError("Этот e‑mail уже используется другим пользователем.")
        return email

    def clean_username(self):
        username = self.cleaned_data['username']
        if not USERNAME_REGEX.match(username):
            raise forms.ValidationError(
                "Логин может содержать только латинские буквы, цифры и подчёркивание."
            )
        if User.objects.filter(username__iexact=username).exclude(pk=self.instance.pk).exists():
            raise forms.ValidationError("Этот логин уже занят.")
        return username

class ProfileForm(forms.Form):
    avatar = forms.FileField(
        required=False,
        label="Новая аватарка",
        help_text="PNG, JPG или GIF"
    )

    def save(self, user):
        avatar_file = self.cleaned_data.get('avatar')
        if avatar_file:
            # читаем бинарно и сохраняем в Profile.avatar
            profile = user.profile
            profile.avatar = avatar_file.read()
            profile.save()