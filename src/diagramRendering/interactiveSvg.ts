import type { DiagramGraph } from "@/diagramModel/diagramGraph";

const SVG_MIME_TYPE = "image/svg+xml";
const EVENT_HANDLER_ATTRIBUTE_PATTERN = /^on/i;
const SCRIPT_URL_PATTERN = /^\s*javascript:/i;

export const NODE_ID_ATTRIBUTE = "data-diagram-node-id";

function dotNodeName(nodeIndex: number): string {
    return `node_${nodeIndex}`;
}

function titleOf(element: Element): string {
    return element.querySelector(":scope > title")?.textContent?.trim() ?? "";
}

function tagNodes(svgRoot: Element, nodeIdByDotName: Map<string, string>) {
    for (const nodeElement of svgRoot.querySelectorAll("g.node")) {
        const nodeId = nodeIdByDotName.get(titleOf(nodeElement));
        if (nodeId !== undefined) {
            nodeElement.setAttribute(NODE_ID_ATTRIBUTE, nodeId);
        }
    }
}

function removeScripts(svgRoot: Element) {
    svgRoot.querySelectorAll("script, foreignObject").forEach((element) => element.remove());
    for (const element of [svgRoot, ...svgRoot.querySelectorAll("*")]) {
        for (const attribute of [...element.attributes]) {
            if (EVENT_HANDLER_ATTRIBUTE_PATTERN.test(attribute.name) || SCRIPT_URL_PATTERN.test(attribute.value)) {
                element.removeAttribute(attribute.name);
            }
        }
    }
}


export function prepareInteractiveSvg(svg: string, graph: DiagramGraph | null): SVGSVGElement | null {
    const svgRoot = new DOMParser().parseFromString(svg, SVG_MIME_TYPE).documentElement;
    if (!(svgRoot instanceof SVGSVGElement)) {
        return null;
    }
    removeScripts(svgRoot);
    if (graph) {
        const nodeIdByDotName = new Map(graph.nodes.map((node, nodeIndex) => [dotNodeName(nodeIndex), node.id]));
        tagNodes(svgRoot, nodeIdByDotName);
    }
    return svgRoot;
}
