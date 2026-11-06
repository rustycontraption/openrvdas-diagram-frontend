// openrvdas-diagram adds each node's type to its <g> class list, like <g class="node source">
export type NodeType = "source" | "logger" | "destination";
const NODE_TYPES: NodeType[] = ["source", "logger", "destination"];

const NODE_SELECTOR = "g.node";
const EDGE_SELECTOR = "g.edge";

export interface DiagramNode {
    // The unique name Graphviz gives the node, like "node_3"
    dotName: string;
    // The text shown in the node box, which can repeat (two YAML files can each have a logger with the same name)
    label: string;
    nodeType: NodeType;
}

export interface DiagramEdge {
    // Like "node_0:out_0:e->node_2:in_0:w", unique because every edge has its own ports
    dotName: string;
    tailNodeName: string;
    headNodeName: string;
}

// One per source: the source and everything downstream of it
export interface Datapath {
    nodes: DiagramNode[];
    edges: DiagramEdge[];
}

export interface DiagramGraph {
    nodes: DiagramNode[];
    datapaths: Datapath[];
}

// Graphviz writes each node's and edge's DOT name into a <title> child
export function readDotName(element: Element): string {
    return element.querySelector(":scope > title")?.textContent?.trim() ?? "";
}

export function findNodeElement(target: Element): SVGGElement | null {
    return target.closest<SVGGElement>(NODE_SELECTOR);
}

export function readElementsByDotName(svgRoot: SVGSVGElement): Map<string, SVGGElement> {
    const elements = [...svgRoot.querySelectorAll<SVGGElement>(`${NODE_SELECTOR}, ${EDGE_SELECTOR}`)];
    return new Map(elements.map((element) => [readDotName(element), element]));
}

function readDiagramNode(nodeElement: SVGGElement): DiagramNode {
    return {
        dotName: readDotName(nodeElement),
        label: nodeElement.querySelector("text")?.textContent?.trim() ?? "",
        nodeType: NODE_TYPES.find((nodeType) => nodeElement.classList.contains(nodeType))!,
    };
}

// Edge ends name a port as well as the node, like "node_0:out_0:e", so only the part before the first colon is kept
function stripEdgePort(edgeEndpoint: string): string {
    return edgeEndpoint.split(":")[0];
}

function readDiagramEdge(edgeElement: SVGGElement): DiagramEdge | null {
    const dotName = readDotName(edgeElement);
    const edgeEndpoints = dotName.split("->");
    if (edgeEndpoints.length !== 2) {
        return null;
    }
    const [tailNodeName, headNodeName] = edgeEndpoints.map(stripEdgePort);
    return { dotName, tailNodeName, headNodeName };
}

function groupEdgesByTailNodeName(edges: DiagramEdge[]): Map<string, DiagramEdge[]> {
    const outgoingEdgesByNodeName = new Map<string, DiagramEdge[]>();
    for (const edge of edges) {
        const outgoingEdges = outgoingEdgesByNodeName.get(edge.tailNodeName) ?? [];
        outgoingEdges.push(edge);
        outgoingEdgesByNodeName.set(edge.tailNodeName, outgoingEdges);
    }
    return outgoingEdgesByNodeName;
}

// A source is a node that no edge points into
function findSourceNodes(nodes: DiagramNode[], edges: DiagramEdge[]): DiagramNode[] {
    const nodeNamesWithIncomingEdges = new Set(edges.map((edge) => edge.headNodeName));
    return nodes.filter((node) => !nodeNamesWithIncomingEdges.has(node.dotName));
}

function walkDatapath(
    sourceNode: DiagramNode,
    nodesByName: Map<string, DiagramNode>,
    outgoingEdgesByNodeName: Map<string, DiagramEdge[]>,
): Datapath {
    const datapath: Datapath = { nodes: [sourceNode], edges: [] };
    const visitedNodeNames = new Set([sourceNode.dotName]);
    for (let visitIndex = 0; visitIndex < datapath.nodes.length; visitIndex++) {
        for (const edge of outgoingEdgesByNodeName.get(datapath.nodes[visitIndex].dotName) ?? []) {
            datapath.edges.push(edge);
            if (!visitedNodeNames.has(edge.headNodeName)) {
                visitedNodeNames.add(edge.headNodeName);
                datapath.nodes.push(nodesByName.get(edge.headNodeName)!);
            }
        }
    }
    return datapath;
}

// Both themes are drawn from the same layout, so reading either theme's SVG gives the same graph
export function readDiagramGraph(svgRoot: SVGSVGElement): DiagramGraph {
    const nodes = [...svgRoot.querySelectorAll<SVGGElement>(NODE_SELECTOR)]
        .map(readDiagramNode)
        .filter((node) => node.dotName !== "");
    const nodesByName = new Map(nodes.map((node) => [node.dotName, node]));
    const edges = [...svgRoot.querySelectorAll<SVGGElement>(EDGE_SELECTOR)]
        .map(readDiagramEdge)
        .filter((edge): edge is DiagramEdge => edge !== null
            && nodesByName.has(edge.tailNodeName) && nodesByName.has(edge.headNodeName));

    const outgoingEdgesByNodeName = groupEdgesByTailNodeName(edges);
    const datapaths = findSourceNodes(nodes, edges)
        .map((sourceNode) => walkDatapath(sourceNode, nodesByName, outgoingEdgesByNodeName));
    return { nodes, datapaths };
}

// The DOT names of every node and edge on a datapath that passes through one of the selected nodes
export function findDatapathDotNames(datapaths: Datapath[], selectedNodeNames: string[]): Set<string> {
    const selectedDatapaths = datapaths.filter((datapath) =>
        datapath.nodes.some((node) => selectedNodeNames.includes(node.dotName)));
    const selectedNodesAndEdges = selectedDatapaths.flatMap((datapath) => [...datapath.nodes, ...datapath.edges]);
    return new Set(selectedNodesAndEdges.map((nodeOrEdge) => nodeOrEdge.dotName));
}
