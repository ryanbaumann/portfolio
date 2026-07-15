import importlib.util
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


SCRIPT_PATH = Path(__file__).with_name("portable_infographic.py")
SPEC = importlib.util.spec_from_file_location("portable_infographic", SCRIPT_PATH)
portable = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(portable)


def config_type(*field_names):
    class Config:
        model_fields = {name: object() for name in field_names}

        def __init__(self, **kwargs):
            self.kwargs = kwargs

    return Config


class SDKConfigCompatibilityTest(unittest.TestCase):
    def test_current_sdk_requests_resolution_and_high_thinking(self):
        fake_types = SimpleNamespace(
            ImageConfig=config_type("aspect_ratio", "image_size"),
            ThinkingConfig=config_type("thinking_level", "include_thoughts"),
        )

        with patch.object(portable, "types", fake_types):
            image = portable._image_config("16:9", "1K")
            thinking = portable._thinking_config()

        self.assertEqual(image.kwargs, {"aspect_ratio": "16:9", "image_size": "1K"})
        self.assertEqual(
            thinking.kwargs,
            {"thinking_level": "HIGH", "include_thoughts": True},
        )

    def test_sdk_1_47_falls_back_to_supported_fields(self):
        fake_types = SimpleNamespace(
            ImageConfig=config_type("aspect_ratio"),
            ThinkingConfig=config_type("thinking_budget", "include_thoughts"),
        )

        with patch.object(portable, "types", fake_types), patch.object(portable, "warn") as warn:
            image = portable._image_config("16:9", "1K")
            thinking = portable._thinking_config()

        self.assertEqual(image.kwargs, {"aspect_ratio": "16:9"})
        self.assertEqual(
            thinking.kwargs,
            {"thinking_budget": -1, "include_thoughts": True},
        )
        warn.assert_called_once_with(
            "Installed google-genai does not expose image_size; using the model's native resolution."
        )


if __name__ == "__main__":
    unittest.main()
