import type { Graphviz } from "@hpcc-js/wasm-graphviz";
import DOMPurify from "dompurify";

const SVG_MIME_TYPE = "image/svg+xml";

let graphvizLoading: Promise<Graphviz> | null = null;

// The WebAssembly build of Graphviz is large, so it is only downloaded the first time a diagram is drawn
function loadGraphviz(): Promise<Graphviz> {
    graphvizLoading ??= import("@hpcc-js/wasm-graphviz").then(({ Graphviz }) => Graphviz.load());
    return graphvizLoading;
}

export async function renderSvg(dot: string): Promise<string> {
    const graphviz = await loadGraphviz();
    return graphviz.dot(dot);
}

function sanitizeSvg(svgRoot: SVGSVGElement) {
    DOMPurify.sanitize(svgRoot, { USE_PROFILES: { svg: true, svgFilters: true }, IN_PLACE: true });
}

export function parseDiagramSvg(svg: string): SVGSVGElement | null {
    const svgRoot = new DOMParser().parseFromString(svg, SVG_MIME_TYPE).documentElement;
    if (!(svgRoot instanceof SVGSVGElement)) {
        return null;
    }
    sanitizeSvg(svgRoot);
    return svgRoot;
}
