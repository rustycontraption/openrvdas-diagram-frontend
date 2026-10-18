# openrvdas-diagram-lambda

The backend for openrvdas-diagram-site. It is a private AWS Lambda, reached only through an API Gateway HTTP API, that runs
[openrvdas-diagram](https://github.com/rustycontraption/openrvdas-diagram) as a library. The tool itself stays a
standalone command line tool; everything AWS-specific lives here.

## API

`POST /diagram`

```json
{
  "configFiles":   [{ "name": "ship.yaml", "content": "..." }],
  "templateFiles": [{ "name": "dsLog_templates.yml", "content": "..." }],
  "colorSchemes":  ["classic-light", "classic-dark"]
}
```

`templateFiles` is optional. Every name must end in `.yml` or `.yaml`, and the combined size is limited to 4 MB.

`colorSchemes` names the openrvdas-diagram color schemes to draw (`classic-light`, `classic-dark`, `viridis-light`,
`viridis-dark`), and DOT is returned for just those, so the response doesn't grow with the number of schemes. It is
optional; without it, only the tool's default scheme (`classic-light`) is returned.

| Status | Body |
|---|---|
| 200 | `{ "dotByColorScheme": { "classic-light": "digraph {...}", ... }, "graphml": "..." }`. Each DOT has a transparent background; the browser lays it out and draws it with Graphviz compiled to WebAssembly |
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

## Deployed infrastructure

Everything runs in AWS region `us-west-2` and was set up manually in the AWS console. The browser calls the API
Gateway HTTP API, which is the only thing allowed to invoke the Lambda; the Lambda has no public address of its own.

```
Browser (https://main.d25weeqazuz5d2.amplifyapp.com)
   │  POST /diagram
   ▼
API Gateway HTTP API (openrvdas-diagram-api)  →  Lambda (openrvdas-diagram)  +  layer (openrvdas-diagram-layer)
```

| Resource | Details |
|---|---|
| API Gateway HTTP API `openrvdas-diagram-api` | Invoke URL `https://lz16vybqb0.execute-api.us-west-2.amazonaws.com`. Route `POST /diagram` → the Lambda (payload format 2.0). `$default` stage with auto-deploy. CORS: origin `https://main.d25weeqazuz5d2.amplifyapp.com`, method `POST`, header `content-type`. Default route throttling: burst 10, rate 5 requests per second. |
| Lambda function `openrvdas-diagram` | Python 3.12, x86_64. Handler `lambda_function.handle`: the console's `lambda_function.py` holds the contents of `src/openrvdas_diagram_lambda/handler.py`. Timeout 29 seconds (the HTTP API gives up after 30). Reserved concurrency 5. No Function URL; its resource-based policy only allows the HTTP API to invoke it. |
| Lambda layer `openrvdas-diagram-layer` | openrvdas-diagram at the release pinned in `src/requirements.txt` (currently v0.1.0), plus PyYAML and graphviz, under `python/`. Each upload is a new numbered version; the function uses one specific version. |
| Logs | CloudWatch log group `/aws/lambda/openrvdas-diagram`. Unexpected errors are JSON lines with `"event": "diagram_generation_failed"` and the `requestId` users see as their reference ID. API Gateway access logs are not enabled. |

Things to keep in mind:
* The CORS origin must match the site's address exactly, with no trailing slash. If the site moves to another
  domain or branch, add that address to the API's CORS settings.
* Requests that API Gateway rejects or throttles never reach the Lambda, so they don't appear in its logs.

## Deploying changes

`handler.py` in this repo is the source of truth for the function code: change it here first, then paste it into
the console, so the two never drift apart.

### New openrvdas-diagram release
1. Change the tag in `src/requirements.txt` (the only place the version is pinned; `pyproject.toml` reads it too).
2. Build the layer, from this `lambda/` folder (the venv doesn't need to be active):

   ```bash
   rm -rf build/layer openrvdas-diagram-layer.zip
   pip install --no-compile --target build/layer/python -r src/requirements.txt
   python3 -c "import shutil; shutil.make_archive('openrvdas-diagram-layer', 'zip', 'build/layer')"
   ```

   Build on Linux x86_64 with Python 3.12: PyYAML includes a compiled part that has to match the Lambda runtime.
   `build/` and the zip are build output and are not checked in.
3. Lambda console → **Layers → openrvdas-diagram-layer → Create version** → upload `openrvdas-diagram-layer.zip`
   (compatible architecture `x86_64`, runtime `Python 3.12`).
4. Function `openrvdas-diagram` → **Code → Layers → Edit** → switch to the new layer version.

### Handler change
Function `openrvdas-diagram` → **Code** tab → replace the contents of `lambda_function.py` with the new
`src/openrvdas_diagram_lambda/handler.py` → **Deploy**.

### Rolling back
* **Tool release:** **Code → Layers → Edit** → choose the previous layer version.
* **Handler:** paste the older `handler.py` from git and click **Deploy**.

To snapshot code and layer together, use **Actions → Publish new version** after each deployment and point an alias
(e.g. `live`) at it; rolling back is then a matter of pointing the alias at an earlier version.

### Checking the deployment

```bash
curl -i -H 'Content-Type: application/json' \
  -d '{"configFiles":[{"name":"ship.yaml","content":"loggers: {}\n"}]}' \
  https://lz16vybqb0.execute-api.us-west-2.amazonaws.com/diagram
```

It should return `200` with `dot` and `graphml`. To test the function alone from its **Test** tab, use this event:

```json
{"body": "{\"configFiles\":[{\"name\":\"ship.yaml\",\"content\":\"loggers: {}\\n\"}]}", "isBase64Encoded": false}
```
