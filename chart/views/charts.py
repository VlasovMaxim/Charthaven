import io
import json

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from django.http import JsonResponse
from django.shortcuts import render
from ..models import SavedChart, UploadedFile
from .helpers import (
    _user_has_saved_chart_with_same_title,
    apply_chart_appearance,
    get_uploaded_file_for_request,
)

ALLOWED_CHART_TYPES = frozenset(
    {"line", "bar", "pie", "hist", "scatter", "area"}
)
INVALID_TABULAR_FILE_ERROR = (
    "Файл имеет некорректную структуру. Загрузите корректный CSV или Excel с заголовками столбцов и данными."
)


def _validate_uploaded_dataframe(df):
    """Базовая валидация структуры загруженной таблицы до построения графиков."""
    if df is None or df.empty:
        return INVALID_TABULAR_FILE_ERROR

    if not isinstance(df.columns, pd.Index) or len(df.columns) == 0:
        return INVALID_TABULAR_FILE_ERROR

    non_empty_columns = [str(c).strip() for c in df.columns if str(c).strip()]
    if not non_empty_columns:
        return INVALID_TABULAR_FILE_ERROR

    numeric_df = df.select_dtypes(include=[np.number])
    if numeric_df.shape[1] == 0:
        for col in df.columns:
            series = pd.to_numeric(df[col], errors="coerce")
            if series.notna().any():
                numeric_df = pd.DataFrame({col: series})
                break
    if numeric_df.shape[1] == 0:
        return INVALID_TABULAR_FILE_ERROR

    return None


def _axes_validation_error(df, chart_type, x_axis, y_axis):
    """Проверка имён колонок до построения графика (понятная ошибка вместо KeyError)."""
    if x_axis is None or (chart_type != "hist" and y_axis is None):
        return "Не указаны столбцы для осей."
    if x_axis not in df.columns:
        return f"Столбец «{x_axis}» отсутствует в файле."
    if chart_type != "hist" and y_axis not in df.columns:
        return f"Столбец «{y_axis}» отсутствует в файле."
    return None


def index(request):
    return render(request, "chart/index.html")


def upload_file(request):
    if request.method == "POST":
        f = request.FILES.get("file")
        if not f or not f.name.lower().endswith((".csv", ".xlsx", ".xls")):
            return JsonResponse({"error": "Пожалуйста, выберите файл CSV или Excel."})

        data_bytes = f.read()
        if not data_bytes:
            return JsonResponse({"error": "Файл пуст или не удалось прочитать."}, status=400)

        try:
            if f.name.lower().endswith(".csv"):
                df = pd.read_csv(io.BytesIO(data_bytes))
            else:
                df = pd.read_excel(io.BytesIO(data_bytes))
        except Exception:
            return JsonResponse({"error": INVALID_TABULAR_FILE_ERROR}, status=400)

        validation_error = _validate_uploaded_dataframe(df)
        if validation_error:
            return JsonResponse({"error": validation_error}, status=400)

        preview = df.head().to_html(classes="data", header="true", index=False)
        cols = df.columns.tolist()
        if request.user.is_authenticated:
            uf = UploadedFile.objects.create(
                user=request.user,
                session_key=None,
                filename=f.name,
                data=data_bytes,
            )
        else:
            if not request.session.session_key:
                request.session.create()
            uf = UploadedFile.objects.create(
                user=None,
                session_key=request.session.session_key,
                filename=f.name,
                data=data_bytes,
            )

        return JsonResponse(
            {
                "preview_data": preview,
                "columns": cols,
                "uploadedFileId": uf.id,
                "uploadedFileName": uf.filename,
            }
        )

    return JsonResponse({"error": "Метод не поддерживается."})


def create_chart(request):
    try:
        payload = json.loads(request.body)
        chart_type = payload.get("chartType")
        x_axis = payload.get("xAxis")
        y_axis = payload.get("yAxis")
        chart_color = payload.get("chartColor")
        chart_colors = payload.get("chartColors")
        chart_title = payload.get("chartTitle")
        x_label = payload.get("xLabel", "")
        y_label = payload.get("yLabel", "")
        line_width = float(payload.get("lineWidth", 2))
        line_style = payload.get("lineStyle", "solid")
        bins = int(payload.get("bins", 20)) if payload.get("bins") else None
        uploaded_file_id = payload.get("uploadedFileId")
        save_to_library = payload.get("saveToLibrary", True)
        appearance = payload.get("appearance") or {}

        if not uploaded_file_id:
            return JsonResponse({"error": "Не указан ID загруженного файла."}, status=400)

        if chart_type not in ALLOWED_CHART_TYPES:
            return JsonResponse({"error": "Неподдерживаемый тип графика."}, status=400)

        uf = get_uploaded_file_for_request(request, uploaded_file_id)

        try:
            if uf.filename.lower().endswith(".csv"):
                df = pd.read_csv(io.BytesIO(uf.data))
            elif uf.filename.lower().endswith((".xls", ".xlsx")):
                df = pd.read_excel(io.BytesIO(uf.data))
            else:
                return JsonResponse({"error": "Неподдерживаемый формат файла"}, status=400)
        except Exception:
            return JsonResponse({"error": INVALID_TABULAR_FILE_ERROR}, status=400)

        validation_error = _validate_uploaded_dataframe(df)
        if validation_error:
            return JsonResponse({"error": validation_error}, status=400)

        axis_err = _axes_validation_error(df, chart_type, x_axis, y_axis)
        if axis_err:
            return JsonResponse({"error": axis_err}, status=400)

        dash_map = {
            "solid": "solid",
            "dotted": "dot",
            "dashed": "dash",
            "long_dashed": "longdash",
            "dash_dotted": "dashdot",
            "long_dash_dotted": "longdashdot",
        }
        dash = dash_map.get(line_style, "solid")

        if chart_type == "line":
            fig = go.Figure(
                go.Scatter(
                    x=df[x_axis],
                    y=df[y_axis],
                    mode="lines+markers",
                    line=dict(color=chart_color or None, width=line_width, dash=dash),
                    marker=dict(size=6),
                )
            )
        elif chart_type == "bar":
            fig = px.bar(
                df,
                x=x_axis,
                y=y_axis,
                title=chart_title,
                color_discrete_sequence=[chart_color] if chart_color else None,
            )
        elif chart_type == "pie":
            fig = px.pie(
                df,
                names=x_axis,
                values=y_axis,
                title=chart_title,
                color_discrete_sequence=chart_colors or px.colors.qualitative.Plotly,
            )
        elif chart_type == "hist":
            fig = px.histogram(
                df,
                x=x_axis,
                title=chart_title,
                nbins=bins or 20,
                color_discrete_sequence=[chart_color] if chart_color else None,
            )
        elif chart_type == "scatter":
            fig = px.scatter(
                df,
                x=x_axis,
                y=y_axis,
                title=chart_title,
                color_discrete_sequence=[chart_color] if chart_color else None,
            )
        elif chart_type == "area":
            fig = px.area(
                df,
                x=x_axis,
                y=y_axis,
                title=chart_title,
                color_discrete_sequence=[chart_color] if chart_color else None,
            )

        fig.update_layout(xaxis_title=x_label, yaxis_title=y_label, autosize=True)
        apply_chart_appearance(fig, appearance)

        def to_list(o):
            if isinstance(o, np.ndarray):
                return o.tolist()
            if isinstance(o, dict):
                return {k: to_list(v) for k, v in o.items()}
            if isinstance(o, list):
                return [to_list(v) for v in o]
            return o

        graph_data = to_list(fig.to_dict()["data"])
        layout_json = to_list(fig.to_dict()["layout"])
        columns_json = df.columns.tolist()
        preview_html = df.head().to_html(classes="data", header="true", index=False)

        settings_json = {
            "chartTitle": chart_title,
            "xAxis": x_axis,
            "yAxis": y_axis,
            "xLabel": x_label,
            "yLabel": y_label,
            "chartColor": chart_color,
            "chartColors": chart_colors,
            "lineWidth": line_width,
            "lineStyle": line_style,
            "bins": bins,
            "appearance": {
                "fontFamily": appearance.get("fontFamily"),
                "fontColor": appearance.get("fontColor"),
                "backgroundColor": appearance.get("backgroundColor"),
                "showGrid": appearance.get("showGrid", True),
                "showLegend": appearance.get("showLegend", True),
                "legendPosition": appearance.get("legendPosition", "right"),
            },
        }

        if save_to_library:
            if not request.user.is_authenticated:
                return JsonResponse(
                    {
                        "error": "Войдите в аккаунт, чтобы сохранить график в коллекцию «Созданные графики».",
                    },
                    status=403,
                )
            if _user_has_saved_chart_with_same_title(request.user, chart_title):
                return JsonResponse(
                    {
                        "error": "График с таким названием уже сохранён. Укажите другое название.",
                    },
                    status=400,
                )
            SavedChart.objects.create(
                user=request.user,
                uploaded_file=uf,
                chart_type=chart_type,
                data_json=graph_data,
                layout_json=layout_json,
                preview_html=preview_html,
                columns_json=columns_json,
                settings_json=settings_json,
            )

        return JsonResponse(
            {
                "graphData": graph_data,
                "layout": layout_json,
                "columns": columns_json,
                "preview_data": preview_html,
                "saved": bool(save_to_library),
            }
        )

    except Exception as e:
        return JsonResponse({"error": f"Ошибка при создании графика: {e}"}, status=500)
