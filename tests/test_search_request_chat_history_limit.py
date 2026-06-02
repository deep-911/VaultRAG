import ast
import copy
import unittest
from pathlib import Path

from pydantic import BaseModel, Field, ValidationError, field_validator


def load_search_request_models():
    source = Path("main.py").read_text(encoding="utf-8")
    module = ast.parse(source, filename="main.py")

    wanted = []
    for node in module.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "MAX_CHAT_HISTORY_ITEMS":
                    wanted.append(copy.deepcopy(node))
        elif isinstance(node, ast.ClassDef) and node.name in {
            "ChatHistoryItem",
            "SearchRequest",
        }:
            wanted.append(copy.deepcopy(node))

    if len(wanted) != 3:
        raise AssertionError("Could not locate search request models in main.py")

    isolated_module = ast.Module(body=wanted, type_ignores=[])
    ast.fix_missing_locations(isolated_module)

    namespace = {
        "BaseModel": BaseModel,
        "Field": Field,
        "field_validator": field_validator,
    }
    exec(compile(isolated_module, filename="main.py", mode="exec"), namespace)
    return namespace["SearchRequest"], namespace["MAX_CHAT_HISTORY_ITEMS"]


class SearchRequestChatHistoryLimitTests(unittest.TestCase):
    def test_accepts_chat_history_at_configured_limit(self):
        SearchRequest, max_items = load_search_request_models()
        chat_history = [
            {"role": "user", "text": f"Question {idx}"}
            for idx in range(max_items)
        ]

        req = SearchRequest(
            query="summarize the latest report",
            user_role="Employee",
            chat_history=chat_history,
        )

        self.assertEqual(len(req.chat_history), max_items)

    def test_rejects_oversized_chat_history(self):
        SearchRequest, max_items = load_search_request_models()
        chat_history = [
            {"role": "user", "text": f"Question {idx}"}
            for idx in range(max_items + 1)
        ]

        with self.assertRaises(ValidationError):
            SearchRequest(
                query="summarize the latest report",
                user_role="Employee",
                chat_history=chat_history,
            )


if __name__ == "__main__":
    unittest.main()
