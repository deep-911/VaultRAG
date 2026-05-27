import ast
import copy
import unittest
from pathlib import Path


def load_upload_request_content_validator():
    source = Path("main.py").read_text(encoding="utf-8")
    module = ast.parse(source, filename="main.py")

    validator = None
    for node in module.body:
        if not isinstance(node, ast.ClassDef) or node.name != "UploadRequest":
            continue
        for child in node.body:
            if isinstance(child, ast.FunctionDef) and child.name == "validate_content":
                validator = copy.deepcopy(child)
                validator.decorator_list = []
                break

    if validator is None:
        raise AssertionError("Could not locate UploadRequest.validate_content in main.py")

    isolated_module = ast.Module(body=[validator], type_ignores=[])
    ast.fix_missing_locations(isolated_module)

    namespace = {}
    exec(compile(isolated_module, filename="main.py", mode="exec"), namespace)
    return namespace["validate_content"]


class UploadRequestContentValidationTests(unittest.TestCase):
    def test_strips_content_whitespace(self):
        validate_content = load_upload_request_content_validator()

        normalized = validate_content(object(), "  quarterly revenue summary  ")

        self.assertEqual(normalized, "quarterly revenue summary")

    def test_rejects_blank_content(self):
        validate_content = load_upload_request_content_validator()

        with self.assertRaises(ValueError):
            validate_content(object(), " \n\t ")


if __name__ == "__main__":
    unittest.main()
