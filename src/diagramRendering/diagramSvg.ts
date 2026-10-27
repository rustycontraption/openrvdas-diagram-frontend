import type { Graphviz } from "@hpcc-js/wasm-graphviz";
import DOMPurify from "dompurify";

const SVG_MIME_TYPE = "image/svg+xml";

export interface DatapathGroup {
    elements: Set<SVGGElement>;
}

export interface PreparedSvg {
    svgRoot: SVGSVGElement;
    datapathGroupsByElement: Map<SVGGElement, DatapathGroup[]>;
}

interface OutgoingEdge {
    edgeElement: SVGGElement;
    headNodeTitle: string;
}

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

// Graphviz writes each node's and edge's DOT name into a <title> child
function getElementTitle(element: Element): string {
    return element.querySelector(":scope > title")?.textContent?.trim() ?? "";
}

// Edge titles name their ends with ports, like "node_0:e"
function stripEdgePortLocation(edgeEndpoint: string): string {
    return edgeEndpoint.split(":")[0];
}

function walkDatapath(
    sourceNodeTitle: string,
    nodeElementsByTitle: Map<string, SVGGElement>,
    outgoingEdgesByNodeTitle: Map<string, OutgoingEdge[]>,
): DatapathGroup {
    const datapathGroup: DatapathGroup = { elements: new Set() };
    const visitedNodeTitles = new Set([sourceNodeTitle]);
    const nodeTitlesToVisit = [sourceNodeTitle];
    for (let visitIndex = 0; visitIndex < nodeTitlesToVisit.length; visitIndex++) {
        const nodeTitle = nodeTitlesToVisit[visitIndex];
        datapathGroup.elements.add(nodeElementsByTitle.get(nodeTitle)!);
        for (const { edgeElement, headNodeTitle } of outgoingEdgesByNodeTitle.get(nodeTitle) ?? []) {
            datapathGroup.elements.add(edgeElement);
            if (!visitedNodeTitles.has(headNodeTitle)) {
                visitedNodeTitles.add(headNodeTitle);
                nodeTitlesToVisit.push(headNodeTitle);
            }
        }
    }
    return datapathGroup;
}

// A source is a node that no edge points into
function findSourceNodeTitles(
    nodeTitles: Iterable<string>,
    outgoingEdgesByNodeTitle: Map<string, OutgoingEdge[]>,
): string[] {
    const nodeTitlesWithIncomingEdges = new Set<string>();
    for (const outgoingEdges of outgoingEdgesByNodeTitle.values()) {
        for (const { headNodeTitle } of outgoingEdges) {
            nodeTitlesWithIncomingEdges.add(headNodeTitle);
        }
    }
    return [...nodeTitles].filter((nodeTitle) => !nodeTitlesWithIncomingEdges.has(nodeTitle));
}

/**
 * Walks forward from every source (a node with no incoming edges) and stops at the destinations, so a click on any
 * element can later look up its datapath. Edges or nodes whose titles can't be read are left out of every group.
 */
function buildDatapathGroups(svgRoot: SVGSVGElement): Map<SVGGElement, DatapathGroup[]> {
    // Get the title of all SVG elements
    const nodeElementsByTitle = new Map<string, SVGGElement>();
    for (const nodeElement of svgRoot.querySelectorAll<SVGGElement>("g.node")) {
        const nodeTitle = getElementTitle(nodeElement);
        if (nodeTitle) {
            nodeElementsByTitle.set(nodeTitle, nodeElement);
        }
    }

    const outgoingEdgesByNodeTitle = new Map<string, OutgoingEdge[]>();
    for (const edgeElement of svgRoot.querySelectorAll<SVGGElement>("g.edge")) {
        // element title looks like node_0:e->node_2:w
        // split it to get edge endpoints
        const edgeEndpoints = getElementTitle(edgeElement).split("->");
        if (edgeEndpoints.length !== 2) {
            continue;
        }
        const [tailNodeTitle, headNodeTitle] = edgeEndpoints.map(stripEdgePortLocation);
        if (!nodeElementsByTitle.has(tailNodeTitle) || !nodeElementsByTitle.has(headNodeTitle)) {
            continue;
        }

        const outgoingEdges = outgoingEdgesByNodeTitle.get(tailNodeTitle);
        if (outgoingEdges) {
            outgoingEdges.push({ edgeElement, headNodeTitle });
        } else {
            outgoingEdgesByNodeTitle.set(tailNodeTitle, [{ edgeElement, headNodeTitle }]);
        }
    }

    const sourceNodeTitles = findSourceNodeTitles(nodeElementsByTitle.keys(), outgoingEdgesByNodeTitle);
    const datapathGroupsByElement = new Map<SVGGElement, DatapathGroup[]>();
    for (const sourceNodeTitle of sourceNodeTitles) {
        const datapathGroup = walkDatapath(sourceNodeTitle, nodeElementsByTitle, outgoingEdgesByNodeTitle);
        for (const element of datapathGroup.elements) {
            const elementGroups = datapathGroupsByElement.get(element);
            if (elementGroups) {
                elementGroups.push(datapathGroup);
            } else {
                datapathGroupsByElement.set(element, [datapathGroup]);
            }
        }
    }
    return datapathGroupsByElement;
}

export function prepareInteractiveSvg(svg: string): PreparedSvg | null {
    const svgRoot = new DOMParser().parseFromString(svg, SVG_MIME_TYPE).documentElement;
    if (!(svgRoot instanceof SVGSVGElement)) {
        return null;
    }
    sanitizeSvg(svgRoot);
    return { svgRoot, datapathGroupsByElement: buildDatapathGroups(svgRoot) };
}
