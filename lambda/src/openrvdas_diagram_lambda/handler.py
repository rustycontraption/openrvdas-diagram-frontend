"""AWS Lambda entry point: turns uploaded OpenRVDAS YAMLs into generic GraphML and Graphviz DOT.

The browser lays out and draws the DOT itself, so no Graphviz binary is needed here.

Invoked through a Lambda Function URL (payload format 2.0, the same as an API Gateway HTTP API).
CORS is configured on the Function URL, not here.
"""

import base64
import json
import logging
import re
import tempfile
import traceback
from pathlib import Path

from openrvdas_diagram.errors import UserInputError
from openrvdas_diagram.graphml_builder import GRAPHML_FORMAT_GENERIC, GraphmlBuilder
from openrvdas_diagram.graphml_renderer import GraphmlRenderer
from openrvdas_diagram.logger_inventory_builder import LoggerInventoryBuilder

# Stays under the 6 MB Lambda payload limit once JSON overhead is added
MAXIMUM_UPLOAD_BYTES = 4 * 1024 * 1024
YAML_FILE_PATTERN = re.compile(r"\.ya?ml$", re.IGNORECASE)
CONFIG_DIRECTORY_NAME = "config"
TEMPLATE_DIRECTORY_NAME = "templates"
INTERNAL_ERROR_MESSAGE = "Something went wrong while generating the diagram."

log = logging.getLogger(__name__)
log.setLevel(logging.INFO)


class InvalidRequestError(Exception):
    pass


def json_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }


def error_response(status_code, request_id, code, message, details=None):
    error = {"code": code, "message": message, "requestId": request_id}
    if details:
        error["details"] = details
    return json_response(status_code, {"error": error})


def read_request_body(event):
    body_text = event.get("body") or ""
    if event.get("isBase64Encoded"):
        body_text = base64.b64decode(body_text).decode("utf-8")
    try:
        return json.loads(body_text)
    except json.JSONDecodeError as error:
        raise InvalidRequestError("Request body must be JSON.") from error


def is_yaml_file_list(value):
    return isinstance(value, list) and all(
        isinstance(file, dict)
        and isinstance(file.get("name"), str)
        and isinstance(file.get("content"), str)
        and YAML_FILE_PATTERN.search(file["name"])
        for file in value
    )


def validate_request(body):
    """Returns (config_files, template_files), or raises InvalidRequestError."""
    if not isinstance(body, dict):
        raise InvalidRequestError("Request body must be a JSON object.")
    config_files = body.get("configFiles")
    template_files = body.get("templateFiles") or []
    if not is_yaml_file_list(config_files) or not is_yaml_file_list(template_files):
        raise InvalidRequestError("Every uploaded file must be a .yml or .yaml file.")
    if not config_files:
        raise InvalidRequestError("Upload at least one logger config file.")
    total_bytes = sum(len(file["content"].encode("utf-8")) for file in config_files + template_files)
    if total_bytes > MAXIMUM_UPLOAD_BYTES:
        raise InvalidRequestError("Uploaded files are too large. The combined limit is 4 MB.")
    return config_files, template_files


def write_yaml_files(directory, files):
    directory.mkdir()
    for file in files:
        # Only the base name is used so an uploaded name cannot escape the directory
        (directory / Path(file["name"]).name).write_text(file["content"])


def generate_diagram(config_files, template_files):
    # The tool reads from directories, so files are staged in /tmp, the only writable path in Lambda
    with tempfile.TemporaryDirectory() as working_directory:
        config_dir = Path(working_directory) / CONFIG_DIRECTORY_NAME
        template_dir = Path(working_directory) / TEMPLATE_DIRECTORY_NAME
        write_yaml_files(config_dir, config_files)
        write_yaml_files(template_dir, template_files)
        inventory = LoggerInventoryBuilder().collectAndParseLoggers(config_dir=config_dir, template_dir=template_dir)
    graphml = GraphmlBuilder(inventory, graphml_format=GRAPHML_FORMAT_GENERIC).to_xml()
    return {"dot": GraphmlRenderer(graphml).to_dot(), "graphml": graphml}


def log_unexpected_error(request_id, error):
    log.error(json.dumps({
        "event": "diagram_generation_failed",
        "requestId": request_id,
        "message": str(error),
        "traceback": traceback.format_exc(),
    }))


def handle(event, context):
    request_id = context.aws_request_id
    try:
        config_files, template_files = validate_request(read_request_body(event))
        return json_response(200, generate_diagram(config_files, template_files))
    except InvalidRequestError as error:
        return error_response(400, request_id, "invalid_request", str(error))
    except UserInputError as error:
        return error_response(422, request_id, error.code, error.message, error.details)
    except Exception as error:
        log_unexpected_error(request_id, error)
        return error_response(500, request_id, "internal_error", INTERNAL_ERROR_MESSAGE)
