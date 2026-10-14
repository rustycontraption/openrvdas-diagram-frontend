# openrvdas-diagram-lambda

The backend for openrvdas-diagram-site. It is an AWS Lambda behind an API Gateway HTTP API that runs
[openrvdas-diagram](https://github.com/rustycontraption/openrvdas-diagram) as a library. The tool itself stays a
standalone command line tool; everything AWS-specific lives here.

## API

`POST /diagram`

```json
{
  "configFiles":   [{ "name": "ship.yaml", "content": "..." }],
  "templateFiles": [{ "name": "dsLog_templates.yml", "content": "..." }]
}
```

`templateFiles` is optional. Every name must end in `.yml` or `.yaml`, and the combined size is limited to 4 MB.

| Status | Body |
|---|---|
| 200 | `{ "dot": "digraph {...}", "graphml": "..." }`. The browser lays out and draws the DOT with Graphviz compiled to WebAssembly |
| 400 | `{ "error": { "code": "invalid_request", "message", "requestId" } }` |
| 422 | `{ "error": { "code", "message", "details", "requestId" } }`. A problem in the uploaded files, with an openrvdas-diagram error code such as `missing_template_file` |
| 500 | `{ "error": { "code": "internal_error", "message", "requestId" } }`. Details are only in the CloudWatch log line with the same `requestId` |

## Local development

Requirements: Python 3.12. Graphviz is not needed, since the Lambda only produces DOT text.

```bash
python -m venv .venv
source .venv/bin/activate
# Use a local checkout of the tool so changes to it are picked up immediately
pip install -e ../../openrvdas-diagram pytest
pip install --no-deps -e .
```

To use the version pinned in `src/requirements.txt` instead, run `pip install -e '.[dev]'`.

Run the tests:

```bash
pytest
```

Run the API locally for the site's dev server (`http://localhost:3000`):

```bash
python -m openrvdas_diagram_lambda.local_server
```

It listens on `http://localhost:3001/diagram`.

## Deploying

Requires the [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html),
AWS credentials (`aws configure`) and Python 3.12. The function is pure Python, so `sam build` packages a zip without Docker.

```bash
sam build
sam deploy --guided --parameter-overrides AllowedOrigins=https://<branch>.<app-id>.amplifyapp.com
```

The `DiagramApiUrl` stack output is the value for the site's `NEXT_PUBLIC_DIAGRAM_API_URL` in Amplify.

When openrvdas-diagram changes, update the pinned commit in `src/requirements.txt` and redeploy. It is the only
place the version is pinned; `pyproject.toml` reads it too.

Optional: `sam build && sam local start-api --port 3002` runs the packaged function in the real Lambda runtime
(this one step does need Docker). Day-to-day development only needs `local_server` above.
