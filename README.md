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
* Colors come from openrvdas-diagram's color schemes. The color scheme (Classic or Viridis) is chosen in the
  workspace's settings panel and remembered per browser. The site asks the API for that scheme's light and dark
  versions and shows the one matching the site's theme, so switching theme swaps the diagram instantly; choosing
  another scheme fetches its pair and frees the previous one, so only one scheme is held in memory. The SVG has a
  transparent background; PNG downloads are filled with the background the diagram is shown on.
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

## TODO

### Edges with sharp bends on the website
Some edges are drawn with several sharp bends instead of one smooth curve, mostly edges into destinations with many
incoming edges (e.g. `winch` and `rov_herc_temp` into `isc-int-as1.gso.uri.edu` with the nautilus datarec and dataxform
configs).

Cause: the API returns `GraphmlRenderer.to_dot()`, which gives each edge an attachment point on its nodes in config
order. The CLI's PNG first measures the layout and orders attachment points by position, so its edges stay smooth.
The GraphML itself is the same in both. Drawing measured DOT with the browser's Graphviz fixes these edges.

Possible fixes:
* **Measuring pass in the browser:** lay out the DOT once with the browser's Graphviz, reorder each node's attachment
  points (`:in_N` / `:out_N`) by the measured position of the node at the other end, then lay out again. No AWS
  changes, but the ordering rule (in openrvdas-diagram's `GraphmlRenderer._edge_port_indexes`) is then also written in
  TypeScript.
* **Graphviz in the Lambda layer:** add a `to_dot(measure_layout=True)` option to openrvdas-diagram (also usable from
  the CLI) and have the Lambda return measured DOT. The layer would need the Graphviz `dot` program, its libraries and
  plugins, built on Amazon Linux (e.g. in AWS CloudShell), since a copy from another Linux distribution won't run on
  Lambda.

Related: the order of sources changes between runs (openrvdas-diagram keeps them in a set), so the layout, and where
this shows up, can differ each time a diagram is generated.
