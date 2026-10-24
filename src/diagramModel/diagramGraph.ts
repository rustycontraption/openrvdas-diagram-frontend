const GRAPHML_NAMESPACE = "http://graphml.graphdrawing.org/xmlns";
const XML_MIME_TYPE = "application/xml";

export interface DiagramNode {
    id: string;
    label: string;
    /** "source", "logger" or "destination" */
    kind: string;
    group: string;
    data: Record<string, string>;
    graphmlElement: Element;
}

export interface DiagramEdge {
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
}

export interface DiagramGraph {
    nodes: DiagramNode[];
    nodesById: Map<string, DiagramNode>;
    edges: DiagramEdge[];
    outgoingEdgesByNodeId: Map<string, DiagramEdge[]>;
    incomingEdgesByNodeId: Map<string, DiagramEdge[]>;
}

export interface ConnectedElements {
    nodes: DiagramNode[];
    edges: DiagramEdge[];
}

function readDataElements(element: Element): Record<string, string> {
    const dataByKey: Record<string, string> = {};
    for (const dataElement of element.getElementsByTagNameNS(GRAPHML_NAMESPACE, "data")) {
        const key = dataElement.getAttribute("key");
        if (key) {
            dataByKey[key] = dataElement.textContent ?? "";
        }
    }
    return dataByKey;
}

function readNode(nodeElement: Element): DiagramNode {
    const data = readDataElements(nodeElement);
    const id = nodeElement.getAttribute("id") ?? "";
    return {
        id,
        label: data.label ?? id,
        kind: data.kind ?? "",
        group: data.group ?? "",
        data,
        graphmlElement: nodeElement,
    };
}

function readEdge(edgeElement: Element, edgeIndex: number): DiagramEdge {
    return {
        id: edgeElement.getAttribute("id") ?? `edge_${edgeIndex}`,
        sourceNodeId: edgeElement.getAttribute("source") ?? "",
        targetNodeId: edgeElement.getAttribute("target") ?? "",
    };
}

function indexEdgesByNodeId(edges: DiagramEdge[], nodeIdOf: (edge: DiagramEdge) => string): Map<string, DiagramEdge[]> {
    const edgesByNodeId = new Map<string, DiagramEdge[]>();
    for (const edge of edges) {
        const nodeId = nodeIdOf(edge);
        const nodeEdges = edgesByNodeId.get(nodeId);
        if (nodeEdges) {
            nodeEdges.push(edge);
        } else {
            edgesByNodeId.set(nodeId, [edge]);
        }
    }
    return edgesByNodeId;
}

function walk(
    graph: DiagramGraph,
    queue: DiagramNode[],
    edgesByNodeId: Map<string, DiagramEdge[]>,
    nextNodeIdOf: (edge: DiagramEdge) => string,
    visitedNodeIds: Set<string>,
    visitedEdges: Set<DiagramEdge>,
) {
    for (let nextNodeIndex = 0; nextNodeIndex < queue.length; nextNodeIndex++) {
        for (const edge of edgesByNodeId.get(queue[nextNodeIndex].id) ?? []) {
            if (visitedEdges.has(edge)) {
                continue;
            }
            visitedEdges.add(edge);
            const nextNodeId = nextNodeIdOf(edge);
            const nextNode = graph.nodesById.get(nextNodeId);
            if (nextNode && !visitedNodeIds.has(nextNodeId)) {
                visitedNodeIds.add(nextNodeId);
                queue.push(nextNode);
            }
        }
    }
}

/**
 * Traces back to everything feeding the start node, then forward from all of that. It never steps backward after
 * a forward step, so loggers that only share a destination with the start node are left out.
 */
export function findConnectedElements(graph: DiagramGraph, startNodeId: string): ConnectedElements {
    const startNode = graph.nodesById.get(startNodeId);
    if (!startNode) {
        return { nodes: [], edges: [] };
    }
    const visitedNodeIds = new Set([startNodeId]);
    const visitedEdges = new Set<DiagramEdge>();
    console.log("visitedNodeIds", visitedNodeIds);

    const upstreamNodes = [startNode];
    walk(graph, upstreamNodes, graph.incomingEdgesByNodeId, (edge) => edge.sourceNodeId, visitedNodeIds, visitedEdges);
    const connectedNodes = [...upstreamNodes];
    walk(graph, connectedNodes, graph.outgoingEdgesByNodeId, (edge) => edge.targetNodeId, visitedNodeIds, visitedEdges);
    return { nodes: connectedNodes, edges: [...visitedEdges] };
}

export function parseGenericGraphml(graphml: string): DiagramGraph | null {
    const document = new DOMParser().parseFromString(graphml, XML_MIME_TYPE);
    if (document.getElementsByTagName("parsererror").length > 0) {
        return null;
    }
    const nodes = [...document.getElementsByTagNameNS(GRAPHML_NAMESPACE, "node")].map(readNode);
    const edges = [...document.getElementsByTagNameNS(GRAPHML_NAMESPACE, "edge")].map(readEdge);
    return {
        nodes,
        nodesById: new Map(nodes.map((node) => [node.id, node])),
        edges,
        outgoingEdgesByNodeId: indexEdgesByNodeId(edges, (edge) => edge.sourceNodeId),
        incomingEdgesByNodeId: indexEdgesByNodeId(edges, (edge) => edge.targetNodeId),
    };
}
