import ast
import asyncio
import copy
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

class StubLogger:
    def info(self, *args, **kwargs):
        pass

    def warning(self, *args, **kwargs):
        pass

    def error(self, *args, **kwargs):
        pass


class StubBackgroundTasks:
    def __init__(self):
        self.tasks = []

    def add_task(self, func, *args):
        self.tasks.append((func, args))


class HTTPException(Exception):
    def __init__(self, status_code: int, detail):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def load_scan_directory():
    source = Path("main.py").read_text(encoding="utf-8")
    module = ast.parse(source, filename="main.py")

    wanted = []
    for node in module.body:
        if isinstance(node, ast.FunctionDef) and node.name in {
            "_sniff_pdf",
            "_detect_file_kind",
            "_prepare_local_radar_file",
        }:
            wanted.append(copy.deepcopy(node))
        elif isinstance(node, ast.AsyncFunctionDef) and node.name == "scan_directory":
            scan_node = copy.deepcopy(node)
            scan_node.decorator_list = []
            scan_node.args.defaults = []
            scan_node.args.kw_defaults = []
            for arg in scan_node.args.args:
                arg.annotation = None
            wanted.append(scan_node)

    if len(wanted) != 4:
        raise AssertionError("Could not locate Local Radar scan helpers in main.py")

    isolated_module = ast.Module(body=wanted, type_ignores=[])
    ast.fix_missing_locations(isolated_module)

    namespace = {
        "Path": Path,
        "HTTPException": HTTPException,
        "LOCAL_RADAR_EXTENSIONS": {".pdf", ".csv", ".txt"},
        "LOCAL_RADAR_MAX_FILES": 30,
        "UPLOAD_MAX_BYTES": 1024,
        "UPLOAD_ROLE": "Executive",
        "_process_and_store_file": object(),
        "logger": StubLogger(),
        "status": SimpleNamespace(HTTP_403_FORBIDDEN=403),
    }
    exec(compile(isolated_module, filename="main.py", mode="exec"), namespace)
    return namespace["scan_directory"]


class ScanDirectoryQueueValidationTests(unittest.TestCase):
    def test_rejects_employee_scans_before_touching_the_filesystem(self):
        scan_directory = load_scan_directory()
        req = SimpleNamespace(directory_path="Z:\\should-not-be-read")
        background_tasks = StubBackgroundTasks()

        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(scan_directory(req, background_tasks, "Employee"))

        self.assertEqual(ctx.exception.status_code, 403)
        self.assertEqual(ctx.exception.detail, "Only Executive role may scan local directories")
        self.assertEqual(background_tasks.tasks, [])

    def test_rejects_blank_directory_path_before_filesystem_access(self):
        scan_directory = load_scan_directory()
        req = SimpleNamespace(directory_path="   \n\t  ")
        background_tasks = StubBackgroundTasks()

        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(scan_directory(req, background_tasks, "Executive"))

        self.assertEqual(ctx.exception.status_code, 422)
        self.assertEqual(ctx.exception.detail, "directory_path must not be empty")
        self.assertEqual(background_tasks.tasks, [])

    def test_rejects_when_supported_files_are_found_but_none_queue(self):
        scan_directory = load_scan_directory()

        with tempfile.TemporaryDirectory() as tmpdir:
            candidate = Path(tmpdir) / "report.pdf"
            candidate.write_bytes(b"not really a pdf")

            req = SimpleNamespace(directory_path=tmpdir)
            background_tasks = StubBackgroundTasks()

            with self.assertRaises(HTTPException) as ctx:
                asyncio.run(scan_directory(req, background_tasks, "Executive"))

        self.assertEqual(ctx.exception.status_code, 422)
        self.assertIn("none could be queued", ctx.exception.detail)
        self.assertEqual(background_tasks.tasks, [])

    def test_returns_queue_counts_when_a_valid_file_is_found(self):
        scan_directory = load_scan_directory()

        with tempfile.TemporaryDirectory() as tmpdir:
            candidate = Path(tmpdir) / "report.csv"
            candidate.write_bytes(b"name,value\nrevenue,42\n")

            req = SimpleNamespace(directory_path=tmpdir)
            background_tasks = StubBackgroundTasks()

            result = asyncio.run(scan_directory(req, background_tasks, "Executive"))

        self.assertEqual(result["queued"], 1)
        self.assertEqual(result["total_found"], 1)
        self.assertEqual(len(background_tasks.tasks), 1)


if __name__ == "__main__":
    unittest.main()
