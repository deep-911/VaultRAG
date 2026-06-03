import ast
import copy
import unittest
from pathlib import Path


def load_directory_path_validator():
    source = Path("main.py").read_text(encoding="utf-8")
    module = ast.parse(source, filename="main.py")

    validator = None
    for node in module.body:
        if not isinstance(node, ast.ClassDef) or node.name != "DirectoryScanRequest":
            continue
        for child in node.body:
            if isinstance(child, ast.FunctionDef) and child.name == "validate_directory_path":
                validator = copy.deepcopy(child)
                validator.decorator_list = []
                break

    if validator is None:
        raise AssertionError("Could not locate DirectoryScanRequest.validate_directory_path in main.py")

    isolated_module = ast.Module(body=[validator], type_ignores=[])
    ast.fix_missing_locations(isolated_module)

    namespace = {}
    exec(compile(isolated_module, filename="main.py", mode="exec"), namespace)
    return namespace["validate_directory_path"]


class DirectoryScanRequestValidationTests(unittest.TestCase):
    def test_strips_directory_path_whitespace(self):
        validate_directory_path = load_directory_path_validator()

        normalized = validate_directory_path(
            object(),
            "  C:\\VaultRAG\\docs  ",
        )

        self.assertEqual(normalized, "C:\\VaultRAG\\docs")

    def test_rejects_blank_directory_path(self):
        validate_directory_path = load_directory_path_validator()

        with self.assertRaises(ValueError):
            validate_directory_path(object(), "   \n\t  ")


if __name__ == "__main__":
    unittest.main()
