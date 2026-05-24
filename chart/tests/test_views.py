import json

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase


class IndexAndCsrfTests(TestCase):
    """Главная, CSRF на upload/create_chart. Запуск с --settings=chartHaven.settings_test (SQLite)."""

    def test_index_ok(self):
        r = self.client.get("/")
        self.assertEqual(r.status_code, 200)

    def test_upload_rejects_without_csrf_when_enforced(self):
        c = Client(enforce_csrf_checks=True)
        c.get("/")
        f = SimpleUploadedFile("t.csv", b"a,b\n1,2\n", content_type="text/csv")
        r = c.post("/upload/", {"file": f})
        self.assertEqual(r.status_code, 403)

    def test_upload_guest_ok(self):
        f = SimpleUploadedFile("t.csv", b"a,b\n1,2\n", content_type="text/csv")
        r = self.client.post("/upload/", {"file": f})
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIn("uploadedFileId", data)
        self.assertEqual(data.get("columns"), ["a", "b"])

    def test_create_chart_rejects_without_csrf_when_enforced(self):
        c = Client(enforce_csrf_checks=True)
        c.get("/")
        r = c.post(
            "/create_chart/",
            data=json.dumps(
                {
                    "chartType": "line",
                    "xAxis": "a",
                    "yAxis": "b",
                    "uploadedFileId": "1",
                    "saveToLibrary": False,
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 403)

    def test_create_chart_guest_preview_ok(self):
        f = SimpleUploadedFile("t.csv", b"a,b\n1,2\n", content_type="text/csv")
        up = self.client.post("/upload/", {"file": f})
        self.assertEqual(up.status_code, 200)
        uid = up.json()["uploadedFileId"]

        r = self.client.post(
            "/create_chart/",
            data=json.dumps(
                {
                    "chartType": "line",
                    "xAxis": "a",
                    "yAxis": "b",
                    "chartTitle": "T",
                    "xLabel": "",
                    "yLabel": "",
                    "lineWidth": 2,
                    "lineStyle": "solid",
                    "uploadedFileId": str(uid),
                    "saveToLibrary": False,
                    "appearance": {},
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertIn("graphData", body)
        self.assertNotIn("error", body or {})
