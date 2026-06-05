import ast
import asyncio
import copy
import unittest
from pathlib import Path
from types import SimpleNamespace


class HTTPException(Exception):
    def __init__(self, status_code: int, detail):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def load_verify_token():
    source = Path("main.py").read_text(encoding="utf-8")
    module = ast.parse(source, filename="main.py")

    verify_node = None
    for node in module.body:
        if isinstance(node, ast.AsyncFunctionDef) and node.name == "verify_token":
            verify_node = copy.deepcopy(node)
            verify_node.decorator_list = []
            verify_node.args.defaults = []
            for arg in verify_node.args.args:
                arg.annotation = None
            verify_node.returns = None
            break

    if verify_node is None:
        raise AssertionError("Could not locate verify_token in main.py")

    isolated_module = ast.Module(body=[verify_node], type_ignores=[])
    ast.fix_missing_locations(isolated_module)

    namespace = {
        "_TOKEN_ROLE_MAP": {
            "exec-token": "Executive",
            "employee-token": "Employee",
        },
        "HTTPException": HTTPException,
        "status": SimpleNamespace(HTTP_401_UNAUTHORIZED=401),
    }
    exec(compile(isolated_module, filename="main.py", mode="exec"), namespace)
    return namespace["verify_token"]


class VerifyTokenAuthValidationTests(unittest.TestCase):
    def test_rejects_missing_credentials_with_401(self):
        verify_token = load_verify_token()

        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(verify_token(None))

        self.assertEqual(ctx.exception.status_code, 401)
        self.assertEqual(ctx.exception.detail, "Unauthorized - Missing Token")

    def test_rejects_invalid_credentials_with_401(self):
        verify_token = load_verify_token()

        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(verify_token(SimpleNamespace(credentials="bad-token")))

        self.assertEqual(ctx.exception.status_code, 401)
        self.assertEqual(ctx.exception.detail, "Unauthorized - Invalid Token")

    def test_returns_scoped_role_for_known_token(self):
        verify_token = load_verify_token()

        role = asyncio.run(verify_token(SimpleNamespace(credentials="employee-token")))

        self.assertEqual(role, "Employee")


if __name__ == "__main__":
    unittest.main()
