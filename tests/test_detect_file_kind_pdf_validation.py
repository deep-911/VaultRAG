import ast
import copy
import unittest
from pathlib import Path


def load_detect_file_kind():
    source = Path("main.py").read_text(encoding="utf-8")
    module = ast.parse(source, filename="main.py")

    wanted = []
    for node in module.body:
        if isinstance(node, ast.FunctionDef) and node.name in {"_sniff_pdf", "_detect_file_kind"}:
            wanted.append(copy.deepcopy(node))

    if len(wanted) != 2:
        raise AssertionError("Could not locate _sniff_pdf and _detect_file_kind in main.py")

    isolated_module = ast.Module(body=wanted, type_ignores=[])
    ast.fix_missing_locations(isolated_module)

    namespace = {}
    exec(compile(isolated_module, filename="main.py", mode="exec"), namespace)
    return namespace["_detect_file_kind"]


class DetectFileKindPdfValidationTests(unittest.TestCase):
    def test_rejects_mislabeled_pdf_bytes(self):
        detect_file_kind = load_detect_file_kind()

        kind = detect_file_kind("report.pdf", "application/pdf", b"not really a pdf")

        self.assertIsNone(kind)

    def test_accepts_pdf_when_signature_is_present(self):
        detect_file_kind = load_detect_file_kind()

        kind = detect_file_kind("report.pdf", "application/pdf", b"%PDF-1.7 sample bytes")

        self.assertEqual(kind, "pdf")


if __name__ == "__main__":
    unittest.main()
