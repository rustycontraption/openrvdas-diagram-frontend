# openrvdas-diagram-site

Web frontend for [openrvdas-diagram](https://github.com/rustycontraption/openrvdas-diagram), which generates a data-flow diagram from OpenRVDAS logger configuration files.

## Architecture

```
Browser (static Next.js site on AWS Amplify Hosting)
   │  POST /diagram  {configFiles, templateFiles}        ▲  {dot, graphml}
   ▼                                                      │
API Gateway HTTP API  →  Lambda (lambda/: pure Python + openrvdas-diagram, private)
```

* The site is a static export (`output: "export"`). It has no server code and stores nothing.
* The Lambda returns Graphviz DOT text. The browser lays it out and draws it as SVG with Graphviz compiled to
  WebAssembly ([`@hpcc-js/wasm-graphviz`](https://www.npmjs.com/package/@hpcc-js/wasm-graphviz)), loaded on first use.
  PNG downloads are made in the browser from that SVG.
* The diagram API lives in [`lambda/`](lambda/README.md). Only the API Gateway HTTP API may invoke the Lambda; it has no public address of its own. openrvdas-diagram itself stays a standalone command line tool.
* Everything runs in AWS region `us-west-2` and was set up manually in the AWS console. The backend resources are described in [lambda/README.md](lambda/README.md#deployed-infrastructure).

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

## Hosting
The site is hosted on AWS Amplify at [https://main.d25weeqazuz5d2.amplifyapp.com](https://main.d25weeqazuz5d2.amplifyapp.com).

* The Amplify app builds the `main` branch of this repository on every push. `amplify.yml` runs `npm ci` and
  `npm run build` and serves the static export from `out/`.
* The app is set up as a static site (platform `WEB`, framework "Next.js - SSG"), since there is no server code.
* The environment variable `NEXT_PUBLIC_DIAGRAM_API_URL` is set to the HTTP API's Invoke URL,
  `https://lz16vybqb0.execute-api.us-west-2.amazonaws.com`. It is baked in at build time, so changing it needs a
  redeploy.
* If the site's address changes, the new address must also be added to the HTTP API's CORS settings.

Changes to the Lambda or its layer are deployed separately; see
[lambda/README.md](lambda/README.md#deploying-changes).
