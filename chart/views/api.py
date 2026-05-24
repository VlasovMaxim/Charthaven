import base64

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils.timezone import localtime
from ..models import SavedChart


@login_required
def get_saved_charts(request):
    saved_charts = (
        SavedChart.objects.filter(user=request.user)
        .select_related("uploaded_file")
        .order_by("-created_at")
    )
    data = []

    for chart in saved_charts:
        local_created_at = localtime(chart.created_at)
        settings = chart.settings_json or {}
        data.append(
            {
                "id": chart.id,
                "chartType": chart.chart_type,
                "fileName": chart.uploaded_file.filename,
                "uploadedFileId": chart.uploaded_file_id,
                "createdAt": local_created_at.strftime("%Y-%m-%d %H:%M"),
                "createdAtIso": chart.created_at.isoformat(),
                "chartTitle": settings.get("chartTitle") or "",
            }
        )
    return JsonResponse({"charts": data})


@login_required
def get_chart_by_id(request, chart_id):
    chart = get_object_or_404(SavedChart, id=chart_id, user=request.user)
    if request.method == "DELETE":
        chart.delete()
        return JsonResponse({"ok": True})
    if request.method != "GET":
        return JsonResponse({"error": "Метод не поддерживается."}, status=405)
    file_data_b64 = base64.b64encode(chart.uploaded_file.data).decode("utf-8")
    return JsonResponse(
        {
            "chartType": chart.chart_type,
            "dataJson": chart.data_json,
            "layoutJson": chart.layout_json,
            "previewHtml": chart.preview_html,
            "columns": chart.columns_json,
            "fileName": chart.uploaded_file.filename,
            "fileData": file_data_b64,
            "settings": chart.settings_json,
            "uploadedFileId": chart.uploaded_file_id,
        }
    )
