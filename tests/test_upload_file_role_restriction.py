import ast
import asyncio
import copy
import types
import unittest
from pathlib import Path


class HTTPException(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


class BackgroundTasks:
    def __init__(self):
        self.tasks = []

    def add_task(self, func, *args):
        self.tasks.append((func, args))


class FakeFastAPIApp:
    @staticmethod
    def post(*args, **kwargs):
        def decorator(func):
            return func

        return decorator


class UnreadableUploadFile:
    filename = "report.pdf"
    content_type = "application/pdf"

    async def read(self, size: int):
        raise AssertionError("Employee uploads should be rejected before reading file contents")


class FakeUploadFile:
    def __init__(self, chunks, filename="report.pdf", content_type="application/pdf"):
        self._chunks = list(chunks)
        self.filename = filename
        self.content_type = content_type

    async def read(self, size: int):
        if self._chunks:
            return self._chunks.pop(0)
        return b""


def load_upload_file():
    source = Path("main.py").read_text(encoding="utf-8")
    module = ast.parse(source, filename="main.py")

    wanted = []
    for node in module.body:
        if isinstance(node, ast.FunctionDef) and node.name in {"_sniff_pdf", "_detect_file_kind"}:
            wanted.append(copy.deepcopy(node))
        elif isinstance(node, ast.AsyncFunctionDef) and node.name == "upload_file":
            wanted.append(copy.deepcopy(node))

    if len(wanted) != 3:
        raise AssertionError("Could not locate upload_file helpers in main.py")

    isolated_module = ast.Module(body=wanted, type_ignores=[])
    ast.fix_missing_locations(isolated_module)

    namespace = {
        "app": FakeFastAPIApp(),
        "BackgroundTasks": BackgroundTasks,
        "Depends": lambda dependency: dependency,
        "File": lambda *args, **kwargs: None,
        "HTTPException": HTTPException,
        "UPLOAD_MAX_BYTES": 25 * 1024 * 1024,
        "UPLOAD_ROLE": "Executive",
        "UploadFile": object,
        "status": types.SimpleNamespace(
            HTTP_202_ACCEPTED=202,
            HTTP_400_BAD_REQUEST=400,
            HTTP_403_FORBIDDEN=403,
            HTTP_413_REQUEST_ENTITY_TOO_LARGE=413,
        ),
        "verify_token": object(),
        "_process_and_store_file": object(),
    }
    exec(compile(isolated_module, filename="main.py", mode="exec"), namespace)
    return namespace["upload_file"], namespace


class UploadFileRoleRestrictionTests(unittest.TestCase):
    def test_rejects_employee_uploads_before_reading_file(self):
        upload_file, _ = load_upload_file()
        background_tasks = BackgroundTasks()

        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(
                upload_file(
                    background_tasks,
                    UnreadableUploadFile(),
                    "Employee",
                )
            )

        self.assertEqual(ctx.exception.status_code, 403)
        self.assertEqual(ctx.exception.detail, "Only Executive role may upload files")
        self.assertEqual(background_tasks.tasks, [])

    def test_queues_executive_uploads(self):
        upload_file, namespace = load_upload_file()
        background_tasks = BackgroundTasks()
        fake_file = FakeUploadFile([b"%PDF-1.7 test bytes"])

        result = asyncio.run(upload_file(background_tasks, fake_file, "Executive"))

        self.assertEqual(result, {"message": "Ingestion started in the background."})
        self.assertEqual(len(background_tasks.tasks), 1)
        func, args = background_tasks.tasks[0]
        self.assertIs(func, namespace["_process_and_store_file"])
        self.assertEqual(args[1:], ("report.pdf", "Executive", "pdf"))


if __name__ == "__main__":
    unittest.main()
