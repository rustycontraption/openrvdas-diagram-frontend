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

### Requirements
* Python 3.12 with venv support. On Ubuntu: `sudo apt install python3.12-venv`
* A checkout of [openrvdas-diagram](https://github.com/rustycontraption/openrvdas-diagram) next to this repo, so the
  folders look like this:
  ```
  git/
  ├── openrvdas-diagram/        # the tool
  └── openrvdas-diagram-site/   # this repo (lambda/ is inside it)
  ```
  If you don't have it yet, from the folder that contains this repo:
  ```bash
  git clone https://github.com/rustycontraption/openrvdas-diagram.git
  ```

Graphviz is not needed, since the Lambda only produces DOT text.

### One-time setup
Run these from the `lambda/` folder of this repo:

```bash
cd lambda
python3 -m venv .venv
source .venv/bin/activate
# Install the local tool checkout first, so changes to the tool are picked up immediately
pip install -e ../../openrvdas-diagram pytest
# Then this package, without letting pip replace the local tool with the version pinned in src/requirements.txt
pip install --no-deps -e .
```

To use the version pinned in `src/requirements.txt` instead of a local checkout, replace the two `pip install`
lines with `pip install -e '.[dev]'`.

The `.venv` folder is specific to your machine and is not checked in.

### Each new terminal
Activate the venv before running anything below:

```bash
cd lambda
source .venv/bin/activate
```

### Run the tests
```bash
pytest
```

### Run the fake Lambda backend
```bash
python -m openrvdas_diagram_lambda.local_server
```

It listens on `http://localhost:3001/diagram`, runs the real Lambda handler, and allows CORS requests from the site's
dev server. Leave it running and start the site in a second terminal from the repo root with `npm run dev`. The site
calls `http://localhost:3001` automatically during development.

Stop it with Ctrl+C. Restart it after changing the handler or the tool, because it does not reload automatically.

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
