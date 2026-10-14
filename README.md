# openrvdas-diagram-site

Web frontend for [openrvdas-diagram](https://github.com/rustycontraption/openrvdas-diagram), which generates a data-flow diagram from OpenRVDAS logger configuration files.

## Architecture

```
Browser (static Next.js site on AWS Amplify Hosting)
   │  POST /diagram  {configFiles, templateFiles}        ▲  {dot, graphml}
   ▼                                                      │
API Gateway HTTP API  →  Lambda (lambda/: pure Python + openrvdas-diagram)
```

* The site is a static export (`output: "export"`). It has no server code and stores nothing.
* The Lambda returns Graphviz DOT text. The browser lays it out and draws it as SVG with Graphviz compiled to
  WebAssembly ([`@hpcc-js/wasm-graphviz`](https://www.npmjs.com/package/@hpcc-js/wasm-graphviz)), loaded on first use.
  PNG downloads are made in the browser from that SVG.
* The diagram API lives in [`lambda/`](lambda/README.md) and is deployed separately with AWS SAM. openrvdas-diagram itself stays a standalone command line tool.

## Local Development Setup
### Requirements:
* npm
* Python 3.12 for the diagram API (Graphviz is not needed)
### Setup
1) Run `npm install` to install dependencies.
2) Set up the diagram API by following [lambda/README.md](lambda/README.md#local-development), then start it in its own terminal:
   ```bash
   cd lambda && source .venv/bin/activate
   python -m openrvdas_diagram_lambda.local_server
   ```
3) Run the development server with `npm run dev`. In development the site calls the API at `http://localhost:3001` unless `NEXT_PUBLIC_DIAGRAM_API_URL` is set.
4) Open [http://localhost:3000](http://localhost:3000) in a browser

## Deploying
1) Deploy the diagram API (see [lambda/README.md](lambda/README.md#deploying)) and note its `DiagramApiUrl` output.
2) In the Amplify console, connect this repository. `amplify.yml` builds the static site into `out/`.
3) Set the Amplify environment variable `NEXT_PUBLIC_DIAGRAM_API_URL` to the `DiagramApiUrl`, and redeploy. The value is baked in at build time.
4) Make sure the API's `AllowedOrigins` parameter includes the Amplify domain.
