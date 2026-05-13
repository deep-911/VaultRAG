import ast
import copy
import unittest
from pathlib import Path


def load_rbac_search():
    source = Path("main.py").read_text(encoding="utf-8")
    module = ast.parse(source, filename="main.py")

    target = None
    for node in module.body:
        if isinstance(node, ast.FunctionDef) and node.name == "_rbac_search":
            target = copy.deepcopy(node)
            break

    if target is None:
        raise AssertionError("Could not locate _rbac_search in main.py")

    isolated_module = ast.Module(body=[target], type_ignores=[])
    ast.fix_missing_locations(isolated_module)

    namespace = {"RETRIEVAL_FETCH_K": 15, "RETRIEVAL_TOP_K": 2}
    exec(compile(isolated_module, filename="main.py", mode="exec"), namespace)
    return namespace["_rbac_search"], namespace


class EmptyCollection:
    def count(self):
        return 0

    def query(self, *args, **kwargs):
        raise AssertionError("query should not be called for an empty collection")


class FailingEmbeddingModel:
    def encode(self, value):
        raise AssertionError("encode should not be called for an empty collection")


class RbacSearchEmptyCollectionTests(unittest.TestCase):
    def test_returns_empty_without_encoding_or_querying(self):
        rbac_search, namespace = load_rbac_search()
        namespace["collection"] = EmptyCollection()
        namespace["embedding_model"] = FailingEmbeddingModel()
        namespace["cross_encoder_model"] = object()

        result = rbac_search("what is the revenue?", "Employee")

        self.assertEqual(result, [])


if __name__ == "__main__":
    unittest.main()
