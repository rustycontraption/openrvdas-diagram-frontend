import base64
import json
import logging
from dataclasses import dataclass

from openrvdas_diagram_lambda import handler

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"

INLINE_CONFIG_YAML = """
loggers:
  gyro:
    configs:
      - gyro->off
      - gyro->on
configs:
  gyro->off: {}
  gyro->on:
    readers:
      class: SerialReader
    writers:
      class: UDPWriter
      kwargs:
        port: 6224
"""


@dataclass
class FakeLambdaContext:
    aws_request_id: str = "test-request-id"


def invoke(body, base64_encoded=False):
    body_text = json.dumps(body)
    if base64_encoded:
        body_text = base64.b64encode(body_text.encode("utf-8")).decode("ascii")
    response = handler.handle({"body": body_text, "isBase64Encoded": base64_encoded}, FakeLambdaContext())
    return response["statusCode"], json.loads(response["body"])


def config_request(config_yaml, template_files=None):
    body = {"configFiles": [{"name": "ship.yaml", "content": config_yaml}]}
    if template_files is not None:
        body["templateFiles"] = template_files
    return body


def test_inline_configs_without_templates_produce_png_and_graphml():
    status_code, body = invoke(config_request(INLINE_CONFIG_YAML))

    assert status_code == 200
    assert base64.b64decode(body["pngBase64"]).startswith(PNG_SIGNATURE)
    assert body["graphml"].startswith("<?xml")


def test_base64_encoded_body_is_decoded():
    status_code, _ = invoke(config_request(INLINE_CONFIG_YAML, []), base64_encoded=True)

    assert status_code == 200


def test_missing_include_is_reported_to_the_user_with_its_code_and_details():
    config_yaml = "includes:\n  - dsLog_templates.yml\nloggers: {}\n"

    status_code, body = invoke(config_request(config_yaml, []))

    assert status_code == 422
    assert body["error"]["code"] == "missing_template_file"
    assert body["error"]["details"] == {"config_file": "ship.yaml", "template_file": "dsLog_templates.yml"}
    assert body["error"]["requestId"] == "test-request-id"


def test_request_without_config_files_is_rejected():
    status_code, body = invoke({"configFiles": [], "templateFiles": []})

    assert status_code == 400
    assert body["error"]["code"] == "invalid_request"


def test_non_yaml_file_names_are_rejected():
    status_code, body = invoke({"configFiles": [{"name": "../evil.txt", "content": "x"}]})

    assert status_code == 400
    assert body["error"]["code"] == "invalid_request"


def test_body_that_is_not_json_is_rejected():
    response = handler.handle({"body": "not json", "isBase64Encoded": False}, FakeLambdaContext())

    assert response["statusCode"] == 400


def test_unexpected_errors_are_logged_and_hidden_from_the_user(monkeypatch, caplog):
    def fail_to_render(self):
        raise RuntimeError("graphviz exploded")

    monkeypatch.setattr(handler.GraphmlRenderer, "to_png", fail_to_render)

    with caplog.at_level(logging.ERROR):
        status_code, body = invoke(config_request(INLINE_CONFIG_YAML))

    assert status_code == 500
    assert body["error"] == {
        "code": "internal_error",
        "message": handler.INTERNAL_ERROR_MESSAGE,
        "requestId": "test-request-id",
    }
    logged_error = json.loads(caplog.records[-1].getMessage())
    assert logged_error["requestId"] == "test-request-id"
    assert "graphviz exploded" in logged_error["message"]
