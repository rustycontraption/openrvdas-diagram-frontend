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

The function is set up by hand in the AWS Lambda console as a Python 3.12, **x86_64** function, with a zip upload
and a Function URL in front of it.

### 1. Build the deployment zip
From this `lambda/` folder (the venv doesn't need to be active):

```bash
rm -rf build function.zip
pip install --target build -r src/requirements.txt
cp -r src/openrvdas_diagram_lambda build/
(cd build && zip -qr ../function.zip . -x '*/__pycache__/*')
```

`function.zip` holds the handler, openrvdas-diagram at the release pinned in `src/requirements.txt`, and its
dependencies. Building on Linux x86_64 with Python 3.12 gives a PyYAML build that matches the Lambda runtime.
`build/` and `function.zip` are build output and are not checked in.

### 2. Upload it and configure the function
* **Code** tab → **Upload from → .zip file** → choose `function.zip` → **Save**.
* **Code** tab → **Runtime settings → Edit** → Handler: `openrvdas_diagram_lambda.handler.handle`
* **Configuration → General configuration → Edit** → Timeout: 30 seconds.

### 3. Test it in the console
**Test** tab → create an event with this JSON → **Test**:

```json
{
  "body": "{\"configFiles\":[{\"name\":\"ship.yaml\",\"content\":\"loggers: {}\\n\"}]}",
  "isBase64Encoded": false
}
```

It should return `statusCode: 200` with `dot` and `graphml` in the body.

### 4. Create the Function URL
**Configuration → Function URL → Create function URL**:
* Auth type: `NONE`
* **Configure cross-origin resource sharing (CORS)**:
  * Allow origin: the Amplify URL (e.g. `https://main.<app-id>.amplifyapp.com`), plus `http://localhost:3000` if
    local development should use the deployed function
  * Allow methods: `POST`
  * Allow headers: `content-type`

### 5. Limit cost
A Function URL has no request throttling, so under **Configuration → Concurrency → Edit**, reserve a small number
such as 5. New AWS accounts sometimes can't reserve concurrency; skip this step if the console refuses.

### 6. Check it from outside

```bash
curl -i -H 'Content-Type: application/json' \
  -d '{"configFiles":[{"name":"ship.yaml","content":"loggers: {}\n"}]}' \
  https://<function-url>/diagram
```

### 7. Connect the site
In Amplify, set the environment variable `NEXT_PUBLIC_DIAGRAM_API_URL` to the Function URL and redeploy the site.
The value is baked in when the site is built.

### Updating
To deploy a newer openrvdas-diagram release, change the tag in `src/requirements.txt` (the only place the version
is pinned; `pyproject.toml` reads it too). After any change, rebuild the zip (step 1) and upload it (step 2).
