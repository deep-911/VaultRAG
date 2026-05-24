import ast
import copy
import re
import unittest
from pathlib import Path


def load_rbac_search():
    source = Path("main.py").read_text(encoding="utf-8")
    module = ast.parse(source, filename="main.py")

    wanted_names = {
        "_extract_query_keywords",
        "_keyword_overlap_count",
        "_filter_by_similarity",
        "_rerank_by_keywords",
        "_rbac_search",
    }
    wanted_nodes = []
    for node in module.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id in {
                    "_STOPWORDS",
                    "RETRIEVAL_FETCH_K",
                    "RETRIEVAL_TOP_K",
                    "RETRIEVAL_MAX_DISTANCE_ABSOLUTE",
                    "RETRIEVAL_MAX_DISTANCE_DELTA",
                }:
                    wanted_nodes.append(copy.deepcopy(node))
                    break
        elif isinstance(node, ast.FunctionDef) and node.name in wanted_names:
            wanted_nodes.append(copy.deepcopy(node))

    if not wanted_nodes:
        raise AssertionError("Could not locate _rbac_search helper set in main.py")

    isolated_module = ast.Module(body=wanted_nodes, type_ignores=[])
    ast.fix_missing_locations(isolated_module)

    class LoggerStub:
        def warning(self, *args, **kwargs):
            pass

    namespace = {
        "re": re,
        "logger": LoggerStub(),
    }
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
