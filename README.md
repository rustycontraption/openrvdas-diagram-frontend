# openrvdas-diagram-site

Web frontend for [openrvdas-diagram](https://github.com/rustycontraption/openrvdas-diagram), which generates a data-flow diagram from OpenRVDAS logger configuration files.

## Local Development Setup
### Requirements:
* npm
### Setup
1) Run `npm install` to install dependencies.
2) Run the development server with `npm run dev`
3) Open [http://localhost:3000](http://localhost:3000) in a browser

### Diagram tool (local development)
Locally, the site runs the `openrvdas-diagram` CLI to generate diagrams. In production this will be replaced by a call to the openrvdas-diagram Lambda (see `src/server/diagramGenerator/index.ts`).

1) Install [openrvdas-diagram](https://github.com/rustycontraption/openrvdas-diagram) and [Graphviz](https://graphviz.org/) (`sudo apt install graphviz`).
2) If `openrvdas-diagram` and `openrvdas-diagram-render` are not on your `PATH`, point the site at them:
   ```bash
   OPENRVDAS_DIAGRAM_BIN_DIR=/path/to/openrvdas-diagram/.venv/bin npm run dev
   ```
