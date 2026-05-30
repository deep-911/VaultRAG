import ast
import copy
import re
import unittest
from pathlib import Path


def load_rbac_search_components():
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


class FakeEmbeddingVector:
    def __init__(self, values):
        self._values = values

    def tolist(self):
        return list(self._values)


class FakeEmbeddingModel:
    def encode(self, value):
        return FakeEmbeddingVector([0.1, 0.2, 0.3])


class FakeCrossEncoder:
    def __init__(self, scores):
        self._scores = list(scores)

    def predict(self, pairs):
        return self._scores[: len(pairs)]


class FakeCollection:
    def __init__(self, results):
        self._results = results

    def count(self):
        return 3

    def query(self, *args, **kwargs):
        return self._results


class RbacSearchRerankingTests(unittest.TestCase):
    def test_filters_weak_hits_and_prefers_keyword_matches(self):
        rbac_search, namespace = load_rbac_search_components()
        namespace["collection"] = FakeCollection(
            {
                "documents": [[
                    "Revenue increased 22 percent in Q4 and margin improved.",
                    "The soccer team won the weekend tournament.",
                    "General office policy overview for all staff.",
                ]],
                "metadatas": [[
                    {"source_document": "earnings.pdf"},
                    {"source_document": "sports.txt"},
                    {"source_document": "policy.txt"},
                ]],
                "distances": [[0.18, 0.21, 0.72]],
            }
        )
        namespace["embedding_model"] = FakeEmbeddingModel()
        namespace["cross_encoder_model"] = FakeCrossEncoder([0.95])

        result = rbac_search("What drove revenue growth?", "Employee")

        self.assertEqual(
            result,
            [
                {
                    "text": "Revenue increased 22 percent in Q4 and margin improved.",
                    "source_document": "earnings.pdf",
                }
            ],
        )

    def test_returns_empty_when_all_matches_are_too_distant(self):
        rbac_search, namespace = load_rbac_search_components()
        namespace["collection"] = FakeCollection(
            {
                "documents": [[
                    "Vacation policy and public holiday schedule.",
                    "Cafeteria menu for the month.",
                ]],
                "metadatas": [[
                    {"source_document": "hr.txt"},
                    {"source_document": "kitchen.txt"},
                ]],
                "distances": [[1.8, 1.9]],
            }
        )
        namespace["embedding_model"] = FakeEmbeddingModel()
        namespace["cross_encoder_model"] = FakeCrossEncoder([0.7, 0.6])

        result = rbac_search("What is the revenue forecast?", "Employee")

        self.assertEqual(result, [])

    def test_preserves_documents_when_metadata_entries_are_missing(self):
        rbac_search, namespace = load_rbac_search_components()
        namespace["collection"] = FakeCollection(
            {
                "documents": [[
                    "Revenue increased 22 percent in Q4 and margin improved.",
                    "The soccer team won the weekend tournament.",
                ]],
                "metadatas": [[]],
                "distances": [[0.18, 0.21]],
            }
        )
        namespace["embedding_model"] = FakeEmbeddingModel()
        namespace["cross_encoder_model"] = FakeCrossEncoder([0.93])

        result = rbac_search("What drove revenue growth?", "Employee")

        self.assertEqual(
            result,
            [
                {
                    "text": "Revenue increased 22 percent in Q4 and margin improved.",
                    "source_document": "Unknown Source",
                }
            ],
        )

    def test_preserves_distance_alignment_when_blank_documents_are_skipped(self):
        rbac_search, namespace = load_rbac_search_components()
        namespace["collection"] = FakeCollection(
            {
                "documents": [[
                    "Revenue increased 22 percent in Q4 and margin improved.",
                    "   ",
                    "General office policy overview for all staff.",
                ]],
                "metadatas": [[
                    {"source_document": "earnings.pdf"},
                    {"source_document": "blank.txt"},
                    {"source_document": "policy.txt"},
                ]],
                "distances": [[0.18, 0.19, 0.72]],
            }
        )
        namespace["embedding_model"] = FakeEmbeddingModel()
        namespace["cross_encoder_model"] = FakeCrossEncoder([0.97])

        result = rbac_search("What drove revenue growth?", "Employee")

        self.assertEqual(
            result,
            [
                {
                    "text": "Revenue increased 22 percent in Q4 and margin improved.",
                    "source_document": "earnings.pdf",
                }
            ],
        )


if __name__ == "__main__":
    unittest.main()
