# openrvdas-diagram-lambda

The backend for openrvdas-diagram-site. It is an AWS Lambda, reached through a Lambda Function URL, that runs
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

The function is set up by hand in the AWS Lambda console as a Python 3.12, **x86_64** function. It is made of two
parts:

* **A layer** (`openrvdas-diagram-layer.zip`): openrvdas-diagram at the release pinned in `src/requirements.txt`, plus
  PyYAML and graphviz. Every upload publishes a new numbered layer version, so going back to an earlier tool
  release is a matter of picking an earlier version.
* **The function code**: the contents of `src/openrvdas_diagram_lambda/handler.py`, pasted into the console's code
  editor. It only imports the Python standard library and openrvdas-diagram, which the layer provides.

`handler.py` in this repo is the source of truth: make changes there first, then paste them into the console, so
the two never drift apart.

The layer build commands below run from this `lambda/` folder; the venv doesn't need to be active. Build output
goes to `build/` and `openrvdas-diagram-layer.zip`, neither of which is checked in. The zip is made with Python, so
the `zip` command doesn't need to be installed.

### 1. Build the layer

```bash
rm -rf build/layer openrvdas-diagram-layer.zip
pip install --no-compile --target build/layer/python -r src/requirements.txt
python3 -c "import shutil; shutil.make_archive('openrvdas-diagram-layer', 'zip', 'build/layer')"
```

Lambda loads a layer's Python packages from the `python/` folder inside its zip, which is why they are installed
into `build/layer/python`. Build on Linux x86_64 with Python 3.12: PyYAML includes a compiled part that has to match
the Lambda runtime.

### 2. Publish the layer
Lambda console → **Layers → Create layer**:
* Name: `openrvdas-diagram-layer` (keep the same name for later uploads, so they become new versions of
  the same layer)
* Upload `openrvdas-diagram-layer.zip`
* Compatible architectures: `x86_64`; compatible runtimes: `Python 3.12`

### 3. Add the function code
* **Code** tab → open `lambda_function.py` → replace everything in it with the contents of
  `src/openrvdas_diagram_lambda/handler.py` → **Deploy**.
* **Code** tab → **Runtime settings → Edit** → Handler: `lambda_function.handle` (the file is `lambda_function.py`
  and the function in it is `handle`).

### 4. Configure the function
* **Code** tab → **Layers → Add a layer → Custom layers** → choose `openrvdas-diagram-layer` and its newest version.
* **Configuration → General configuration → Edit** → Timeout: 30 seconds.

### 5. Test it in the console
**Test** tab → create an event with this JSON → **Test**:

```json
{
  "body": "{\"configFiles\":[{\"name\":\"ship.yaml\",\"content\":\"loggers: {}\\n\"}]}",
  "isBase64Encoded": false
}
```

It should return `statusCode: 200` with `dot` and `graphml` in the body.

### 6. Create the Function URL
**Configuration → Function URL → Create function URL**:
* Auth type: `NONE`
* **Configure cross-origin resource sharing (CORS)**:
  * Allow origin: the Amplify URL (e.g. `https://main.<app-id>.amplifyapp.com`), plus `http://localhost:3000` if
    local development should use the deployed function
  * Allow methods: `POST`
  * Allow headers: `content-type`

### 7. Limit cost
A Function URL has no request throttling, so under **Configuration → Concurrency → Edit**, reserve a small number
such as 5. New AWS accounts sometimes can't reserve concurrency; skip this step if the console refuses.

### 8. Check it from outside

```bash
curl -i -H 'Content-Type: application/json' \
  -d '{"configFiles":[{"name":"ship.yaml","content":"loggers: {}\n"}]}' \
  https://<function-url>/diagram
```

### 9. Connect the site
In Amplify, set the environment variable `NEXT_PUBLIC_DIAGRAM_API_URL` to the Function URL and redeploy the site.
The value is baked in when the site is built.

### Updating
* **New openrvdas-diagram release:** change the tag in `src/requirements.txt` (the only place the version is pinned;
  `pyproject.toml` reads it too). Rebuild and publish the layer (steps 1 and 2), then in the function go to
  **Code → Layers → Edit** and switch to the new layer version.
* **Handler change:** paste the new contents of `handler.py` into `lambda_function.py` and click **Deploy**.

### Rolling back
In the function, go to **Code → Layers → Edit** and choose the previous layer version. This only rolls back the
layer: if `handler.py` changed in the same release, also paste the older `handler.py` from git and click **Deploy**.

To snapshot code and layer together, use **Actions → Publish new version** after each deployment and point an alias
(e.g. `live`) at it; rolling back is then a matter of pointing the alias at an earlier version.
