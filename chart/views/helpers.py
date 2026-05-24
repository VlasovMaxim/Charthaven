"""Общее состояние и вспомогательные функции для графиков и файлов."""
from django.http import Http404
from django.shortcuts import get_object_or_404

from ..models import UploadedFile, SavedChart


def _normalize_saved_chart_title_for_duplicate_check(chart_title):
    """Одинаковые названия с разным регистром и пробелами считаем дубликатом; пустое — как «Без названия»."""
    s = (chart_title or "").strip()
    if not s:
        s = "Без названия"
    return s.casefold()


def _user_has_saved_chart_with_same_title(user, chart_title):
    norm_new = _normalize_saved_chart_title_for_duplicate_check(chart_title)
    for sc in SavedChart.objects.filter(user=user).only("id", "settings_json"):
        sjson = sc.settings_json if isinstance(sc.settings_json, dict) else {}
        t = (sjson or {}).get("chartTitle")
        if _normalize_saved_chart_title_for_duplicate_check(t) == norm_new:
            return True
    return False


def get_uploaded_file_for_request(request, uploaded_file_id):
    """Доступ к файлу: владелец user или та же сессия (гость)."""
    try:
        pk = int(uploaded_file_id)
    except (TypeError, ValueError):
        raise Http404()
    if request.user.is_authenticated:
        return get_object_or_404(UploadedFile, pk=pk, user=request.user)
    if not request.session.session_key:
        request.session.create()
    return get_object_or_404(
        UploadedFile,
        pk=pk,
        user__isnull=True,
        session_key=request.session.session_key,
    )


def apply_chart_appearance(fig, appearance):
    """Шрифт, сетка, легенда, фон — из JSON поля appearance."""
    if not appearance:
        appearance = {}
    try:
        fig.update_layout(template=None)
    except Exception:
        pass
    font_family = appearance.get("fontFamily")
    font_color = appearance.get("fontColor")
    show_grid = appearance.get("showGrid")
    if show_grid is None:
        show_grid = True
    show_legend = appearance.get("showLegend")
    if show_legend is None:
        show_legend = True
    legend_position = appearance.get("legendPosition") or "right"

    font_kw = {}
    if font_family:
        font_kw["family"] = font_family
    if font_color:
        font_kw["color"] = font_color
    if font_kw:
        fig.update_layout(font=font_kw)

    try:
        fig.update_xaxes(showgrid=bool(show_grid))
    except Exception:
        pass
    try:
        fig.update_yaxes(showgrid=bool(show_grid))
    except Exception:
        pass

    fig.update_layout(showlegend=bool(show_legend))

    if show_legend:
        legend_layouts = {
            "top": dict(orientation="h", yanchor="bottom", y=1.02, x=0.5, xanchor="center"),
            "bottom": dict(orientation="h", yanchor="top", y=-0.22, x=0.5, xanchor="center"),
            "left": dict(orientation="v", x=-0.02, y=0.5, xanchor="right", yanchor="middle"),
            "right": dict(orientation="v", x=1.02, y=0.5, xanchor="left", yanchor="middle"),
        }
        fig.update_layout(legend=legend_layouts.get(legend_position, legend_layouts["right"]))

    bg = appearance.get("backgroundColor")
    if bg:
        try:
            fig.update_layout(paper_bgcolor=bg, plot_bgcolor=bg)
        except Exception:
            pass
