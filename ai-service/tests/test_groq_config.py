import os
import sys
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from agent import nodes


class GroqConfigTests(unittest.TestCase):
    def test_default_model_is_valid_groq_model(self):
        self.assertNotEqual(nodes.DEFAULT_GROQ_MODEL, "Qwen3.8-27B")
        self.assertIn(nodes.DEFAULT_GROQ_MODEL, {
            "llama-3.3-70b-versatile",
            "qwen/qwen3-32b",
            "llama-3.1-8b-instant",
        })

    def test_env_override_is_respected(self):
        original = os.environ.get("GROQ_MODEL")
        try:
            os.environ["GROQ_MODEL"] = "llama-3.1-8b-instant"
            self.assertEqual(nodes.get_groq_model_name(), "llama-3.1-8b-instant")
        finally:
            if original is None:
                os.environ.pop("GROQ_MODEL", None)
            else:
                os.environ["GROQ_MODEL"] = original


if __name__ == "__main__":
    unittest.main()
