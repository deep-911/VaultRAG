import ast
import copy
import unittest
from pathlib import Path


def load_search_validators():
    source = Path("main.py").read_text(encoding="utf-8")
    module = ast.parse(source, filename="main.py")

    validators: dict[tuple[str, str], ast.FunctionDef] = {}
    for node in module.body:
        if not isinstance(node, ast.ClassDef):
            continue
        if node.name not in {"ChatHistoryItem", "SearchRequest"}:
            continue
        for child in node.body:
            if not isinstance(child, ast.FunctionDef):
                continue
            validators[(node.name, child.name)] = copy.deepcopy(child)

    expected = {
        ("ChatHistoryItem", "validate_role"),
        ("ChatHistoryItem", "validate_text"),
        ("SearchRequest", "validate_query"),
        ("SearchRequest", "validate_user_role"),
    }
    if not expected.issubset(validators):
        raise AssertionError("Could not locate all search/chat validators in main.py")

    loaded = {}
    for key in expected:
        func = validators[key]
        func.decorator_list = []
        isolated_module = ast.Module(body=[func], type_ignores=[])
        ast.fix_missing_locations(isolated_module)
        namespace = {}
        exec(compile(isolated_module, filename="main.py", mode="exec"), namespace)
        loaded[key] = namespace[func.name]
    return loaded


class SearchRequestChatHistoryValidationTests(unittest.TestCase):
    def test_strips_query_whitespace(self):
        validators = load_search_validators()

        normalized = validators[("SearchRequest", "validate_query")](
            object(), "  summarize revenue  "
        )

        self.assertEqual(normalized, "summarize revenue")

    def test_rejects_blank_query(self):
        validators = load_search_validators()

        with self.assertRaises(ValueError):
            validators[("SearchRequest", "validate_query")](object(), "   \n\t  ")

    def test_accepts_user_and_assistant_roles(self):
        validators = load_search_validators()

        self.assertEqual(
            validators[("ChatHistoryItem", "validate_role")](object(), "user"),
            "user",
        )
        self.assertEqual(
            validators[("ChatHistoryItem", "validate_role")](object(), "assistant"),
            "assistant",
        )

    def test_rejects_ui_only_system_role(self):
        validators = load_search_validators()

        with self.assertRaises(ValueError):
            validators[("ChatHistoryItem", "validate_role")](object(), "system")

    def test_strips_chat_history_text_whitespace(self):
        validators = load_search_validators()

        normalized = validators[("ChatHistoryItem", "validate_text")](
            object(), "  What happened last quarter?  "
        )

        self.assertEqual(normalized, "What happened last quarter?")

    def test_rejects_blank_chat_history_text(self):
        validators = load_search_validators()

        with self.assertRaises(ValueError):
            validators[("ChatHistoryItem", "validate_text")](object(), "   \n\t  ")


if __name__ == "__main__":
    unittest.main()
