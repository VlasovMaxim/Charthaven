import os
import json
import pandas as pd, io
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate, logout
from .forms import RegisterForm
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from .forms import UserForm, ProfileForm
import random
from .models import UploadedFile, SavedChart
from django.shortcuts import get_object_or_404
import base64
from django.utils.timezone import localtime


uploaded_data = None

def index(request):
    return render(request, 'chart/index.html')


@csrf_exempt
@login_required
def upload_file(request):
    global uploaded_data
    if request.method == 'POST':
        f = request.FILES.get('file')
        if not f or not f.name.lower().endswith(('.csv', '.xlsx', '.xls')):
            return JsonResponse({'error': "Пожалуйста, выберите файл CSV или Excel."})

        folder = os.path.join(os.path.dirname(__file__), 'uploads')
        os.makedirs(folder, exist_ok=True)
        path = os.path.join(folder, f.name)
        with open(path, 'wb+') as dst:
            for chunk in f.chunks():
                dst.write(chunk)

        if f.name.lower().endswith('.csv'):
            uploaded_data = pd.read_csv(path)
        else:
            uploaded_data = pd.read_excel(path)

        preview = uploaded_data.head().to_html(classes='data', header="true", index=False)
        cols = uploaded_data.columns.tolist()

        data_bytes = open(path, 'rb').read()
        uf = UploadedFile.objects.create(
            user=request.user,
            filename=f.name,
            data=data_bytes
        )

        return JsonResponse({
            'preview_data': preview,
            'columns': cols,
            'uploadedFileId': uf.id,
            'uploadedFileName': uf.filename,
        })

    return JsonResponse({'error': "Метод не поддерживается."})

@csrf_exempt
@login_required
def create_chart(request):
    global uploaded_data
    try:
        payload = json.loads(request.body)
        chart_type       = payload.get('chartType')
        x_axis           = payload.get('xAxis')
        y_axis           = payload.get('yAxis')
        chart_color      = payload.get('chartColor')
        chart_colors     = payload.get('chartColors')
        chart_title      = payload.get('chartTitle')
        x_label          = payload.get('xLabel', '')
        y_label          = payload.get('yLabel', '')
        line_width       = float(payload.get('lineWidth', 2))
        line_style       = payload.get('lineStyle', 'solid')
        bins             = int(payload.get('bins', 20)) if payload.get('bins') else None
        uploaded_file_id = payload.get('uploadedFileId')

        if not uploaded_file_id:
            return JsonResponse({'error': 'Не указан ID загруженного файла.'}, status=400)

        # Получаем файл
        uf = get_object_or_404(UploadedFile, id=uploaded_file_id, user=request.user)

        # Если uploaded_data ещё не установлен, восстанавливаем из файла
        if uploaded_data is None:
            try:
                if uf.filename.lower().endswith('.csv'):
                    uploaded_data = pd.read_csv(io.BytesIO(uf.data))
                elif uf.filename.lower().endswith(('.xls', '.xlsx')):
                    uploaded_data = pd.read_excel(io.BytesIO(uf.data))
                else:
                    return JsonResponse({'error': 'Неподдерживаемый формат файла'}, status=400)
            except Exception as e:
                return JsonResponse({'error': f'Ошибка при чтении файла: {e}'}, status=400)

        # Создание графика
        dash_map = {
            'solid': 'solid',
            'dotted': 'dot',
            'dashed': 'dash',
            'long_dashed': 'longdash',
            'dash_dotted': 'dashdot',
            'long_dash_dotted': 'longdashdot'
        }
        dash = dash_map.get(line_style, 'solid')

        if chart_type == "line":
            fig = go.Figure(go.Scatter(
                x=uploaded_data[x_axis],
                y=uploaded_data[y_axis],
                mode='lines+markers',
                line=dict(color=chart_color or None, width=line_width, dash=dash),
                marker=dict(size=6)
            ))
        elif chart_type == "bar":
            fig = px.bar(uploaded_data, x=x_axis, y=y_axis, title=chart_title,
                         color_discrete_sequence=[chart_color] if chart_color else None)
        elif chart_type == "pie":
            fig = px.pie(uploaded_data, names=x_axis, values=y_axis, title=chart_title,
                         color_discrete_sequence=chart_colors or px.colors.qualitative.Plotly)
        elif chart_type == "hist":
            fig = px.histogram(uploaded_data, x=x_axis, title=chart_title, nbins=bins or 20,
                               color_discrete_sequence=[chart_color] if chart_color else None)
        else:
            return JsonResponse({'error': 'Неподдерживаемый тип графика.'}, status=400)

        fig.update_layout(xaxis_title=x_label, yaxis_title=y_label, autosize=True)

        def to_list(o):
            if isinstance(o, np.ndarray):
                return o.tolist()
            if isinstance(o, dict):
                return {k: to_list(v) for k, v in o.items()}
            if isinstance(o, list):
                return [to_list(v) for v in o]
            return o

        graph_data   = to_list(fig.to_dict()['data'])
        layout_json  = to_list(fig.to_dict()['layout'])
        columns_json = uploaded_data.columns.tolist()
        preview_html = uploaded_data.head().to_html(classes='data', header="true", index=False)

        settings_json = {
            'chartTitle':  chart_title,
            'xAxis':       x_axis,
            'yAxis':       y_axis,
            'xLabel':      x_label,
            'yLabel':      y_label,
            'chartColor':  chart_color,
            'chartColors': chart_colors,
            'lineWidth':   line_width,
            'lineStyle':   line_style,
            'bins':        bins,
        }

        SavedChart.objects.create(
            user=request.user,
            uploaded_file=uf,
            chart_type=chart_type,
            data_json=graph_data,
            layout_json=layout_json,
            preview_html=preview_html,
            columns_json=columns_json,
            settings_json=settings_json
        )

        return JsonResponse({
            'graphData':    graph_data,
            'layout':       layout_json,
            'columns':      columns_json,
            'preview_data': preview_html,
        })

    except Exception as e:
        return JsonResponse({'error': f"Ошибка при создании графика: {e}"}, status=500)

def register_view(request):
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            username = form.cleaned_data['username']
            email = form.cleaned_data['email']
            password = form.cleaned_data['password1']

            # Автоматический вход
            login(request, user)
            messages.success(request, 'Регистрация прошла успешно! Вы вошли в систему.')
            return redirect('index')
    else:
        form = RegisterForm()
    return render(request, 'chart/register.html', {'form': form})

def login_view(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            return redirect('index')
        else:
            messages.error(request, 'Неверные учетные данные')
    return render(request, 'chart/login.html')

def logout_view(request):
    logout(request)
    return redirect('index')

@login_required
def profile_view(request):
    user = request.user
    profile = user.profile

    if request.method == 'POST' and 'save_profile' in request.POST:
        # 1) Запоминаем старые значения
        old_username = user.username

        # 2) Поднимаем формы с данными из POST
        uform = UserForm(request.POST, instance=user)
        pform = ProfileForm(request.POST, request.FILES)

        if uform.is_valid() and pform.is_valid():
            # 3) Сохраняем username/email
            uform.save()
            # 4) Сохраняем avatar
            pform.save(user)

            new_username = uform.cleaned_data['username']

            messages.success(request, 'Профиль обновлён.')
            return redirect('profile')

    # === GET — просто рендерим форму профиля ===
    else:
        uform = UserForm(instance=user)
        pform = ProfileForm()

    return render(request, 'chart/profile.html', {
        'uform': uform,
        'pform': pform,
    })

@login_required
def confirm_email_view(request):
    profile = request.user.profile

    if request.method == 'POST':
        code = request.POST.get('code')
        if code == profile.email_confirmation_code:
            # завершаем смену e‑mail
            request.user.email = profile.pending_email
            request.user.save()
            profile.pending_email = None
            profile.email_confirmation_code = None
            profile.save()

            messages.success(request, 'E‑mail успешно изменён.')
            return redirect('profile')
        else:
            messages.error(request, 'Неверный код подтверждения.')

    # при GET просто показываем форму ввода кода
    return render(request, 'chart/confirm_email.html')

@login_required
def get_saved_charts(request):
    saved_charts = SavedChart.objects.filter(user=request.user).select_related('uploaded_file').order_by('-created_at')
    data = []

    for chart in saved_charts:
        local_created_at = localtime(chart.created_at)
        data.append({
            'id': chart.id,
            'chartType': chart.chart_type,
            'fileName': chart.uploaded_file.filename,
            'createdAt': local_created_at.strftime('%Y-%m-%d %H:%M'),
        })
    return JsonResponse({'charts': data})

@login_required
def get_chart_by_id(request, chart_id):
    chart = get_object_or_404(SavedChart, id=chart_id, user=request.user)
    file_data_b64 = base64.b64encode(chart.uploaded_file.data).decode('utf-8')
    return JsonResponse({
        'chartType': chart.chart_type,
        'dataJson': chart.data_json,
        'layoutJson': chart.layout_json,
        'previewHtml': chart.preview_html,
        'columns': chart.columns_json,
        'fileName': chart.uploaded_file.filename,
        'fileData': file_data_b64,
        'settings': chart.settings_json,
    })