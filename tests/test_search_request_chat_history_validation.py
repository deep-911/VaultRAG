import ast
import copy
import unittest
from pathlib import Path

from pydantic import BaseModel, Field, ValidationError, field_validator


def load_search_models():
    source = Path("main.py").read_text(encoding="utf-8")
    module = ast.parse(source, filename="main.py")

    wanted = []
    for node in module.body:
        if isinstance(node, ast.ClassDef) and node.name in {"ChatHistoryItem", "SearchRequest"}:
            wanted.append(copy.deepcopy(node))

    if len(wanted) != 2:
        raise AssertionError("Could not locate ChatHistoryItem and SearchRequest in main.py")

    isolated_module = ast.Module(body=wanted, type_ignores=[])
    ast.fix_missing_locations(isolated_module)

    namespace = {
        "BaseModel": BaseModel,
        "Field": Field,
        "field_validator": field_validator,
    }
    exec(compile(isolated_module, filename="main.py", mode="exec"), namespace)
    return namespace["SearchRequest"]


class SearchRequestChatHistoryValidationTests(unittest.TestCase):
    def test_strips_query_whitespace(self):
        search_request = load_search_models()
        req = search_request(
            query="  summarize revenue  ",
            user_role="Employee",
        )

        self.assertEqual(req.query, "summarize revenue")

    def test_rejects_blank_query(self):
        search_request = load_search_models()
        with self.assertRaises(ValidationError):
            search_request(
                query="   \n\t  ",
                user_role="Employee",
            )

    def test_accepts_user_and_assistant_roles(self):
        search_request = load_search_models()
        req = search_request(
            query="summarize revenue",
            user_role="Employee",
            chat_history=[
                {"role": "user", "text": "What happened last quarter?"},
                {"role": "assistant", "text": "Revenue increased."},
            ],
        )

        self.assertEqual([item.role for item in req.chat_history], ["user", "assistant"])

    def test_rejects_ui_only_system_role(self):
        search_request = load_search_models()
        with self.assertRaises(ValidationError):
            search_request(
                query="summarize revenue",
                user_role="Employee",
                chat_history=[{"role": "system", "text": "Revenue increased."}],
            )


if __name__ == "__main__":
    unittest.main()
