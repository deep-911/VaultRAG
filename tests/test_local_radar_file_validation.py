import ast
import copy
import tempfile
import unittest
from pathlib import Path


class StubLogger:
    def warning(self, *args, **kwargs):
        pass


def load_prepare_local_radar_file():
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

    if len(wanted) != 3:
        raise AssertionError("Could not locate local radar file preparation helpers in main.py")

    isolated_module = ast.Module(body=wanted, type_ignores=[])
    ast.fix_missing_locations(isolated_module)

    namespace = {
        "Path": Path,
        "UPLOAD_MAX_BYTES": 1024,
        "logger": StubLogger(),
    }
    exec(compile(isolated_module, filename="main.py", mode="exec"), namespace)
    return namespace["_prepare_local_radar_file"]


class LocalRadarFileValidationTests(unittest.TestCase):
    def test_rejects_invalid_pdf_extension_when_signature_is_missing(self):
        prepare_local_radar_file = load_prepare_local_radar_file()

        with tempfile.TemporaryDirectory() as tmpdir:
            candidate = Path(tmpdir) / "report.pdf"
            candidate.write_bytes(b"not really a pdf")

            prepared = prepare_local_radar_file(candidate)

        self.assertIsNone(prepared)

    def test_accepts_csv_file(self):
        prepare_local_radar_file = load_prepare_local_radar_file()

        with tempfile.TemporaryDirectory() as tmpdir:
            candidate = Path(tmpdir) / "report.csv"
            candidate.write_bytes(b"name,value\nrevenue,42\n")

            prepared = prepare_local_radar_file(candidate)

        self.assertEqual(prepared, (b"name,value\nrevenue,42\n", "csv"))


if __name__ == "__main__":
    unittest.main()
