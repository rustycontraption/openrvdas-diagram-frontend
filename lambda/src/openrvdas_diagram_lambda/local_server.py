"""Development-only HTTP server that runs the Lambda handler locally, standing in for the Lambda Function URL.

Usage: python -m openrvdas_diagram_lambda.local_server [--port 3001] [--allowed-origin http://localhost:3000]
"""

import argparse
import logging
import uuid
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from openrvdas_diagram_lambda.handler import handle

DIAGRAM_PATH = "/diagram"


@dataclass
class LocalLambdaContext:
    aws_request_id: str = field(default_factory=lambda: str(uuid.uuid4()))


def build_request_handler(allowed_origin):
    class DiagramRequestHandler(BaseHTTPRequestHandler):
        def send_cors_headers(self):
            self.send_header("Access-Control-Allow-Origin", allowed_origin)
            self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")

        def do_OPTIONS(self):
            self.send_response(204)
            self.send_cors_headers()
            self.end_headers()

        def do_POST(self):
            if self.path != DIAGRAM_PATH:
                self.send_response(404)
                self.send_cors_headers()
                self.end_headers()
                return
            content_length = int(self.headers.get("Content-Length", 0))
            event = {"body": self.rfile.read(content_length).decode("utf-8"), "isBase64Encoded": False}
            lambda_response = handle(event, LocalLambdaContext())

            response_body = lambda_response["body"].encode("utf-8")
            self.send_response(lambda_response["statusCode"])
            for header_name, header_value in lambda_response["headers"].items():
                self.send_header(header_name, header_value)
            self.send_header("Content-Length", str(len(response_body)))
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(response_body)

    return DiagramRequestHandler


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--port", type=int, default=3001, help="Port to listen on. Default is 3001")
    parser.add_argument(
        "--allowed-origin",
        default="http://localhost:3000",
        help="Origin allowed by CORS, normally the Next.js dev server. Default is http://localhost:3000",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    server = ThreadingHTTPServer(("localhost", args.port), build_request_handler(args.allowed_origin))
    print(f"Diagram API listening on http://localhost:{args.port}{DIAGRAM_PATH}")
    server.serve_forever()


if __name__ == "__main__":
    main()
