import { readDiagramGraph, type Datapath, type DiagramNode } from "./graph";
import { parseDiagramSvg, renderSvg } from "./svg";
import type { GraphmlFormats } from "@/components/diagram/api/types";

export interface Diagram {
    id: number;
    // The diagram service's DOT supplies the layout only; the browser colors it
    dot: string;
    // Kept as text so exports start from a clean copy, without the on-screen colors or highlight
    svg: string;
    svgRoot: SVGSVGElement;
    nodes: DiagramNode[];
    datapaths: Datapath[];
    graphml: Record<GraphmlFormats, string>;
    summary: string;
}

// The parts of a diagram that come from the diagram service; everything else is rebuilt from them
export type SavedDiagram = Pick<Diagram, "dot" | "graphml" | "summary">;

function parseSvgRoot(svg: string): SVGSVGElement {
    const svgRoot = parseDiagramSvg(svg);
    if (!svgRoot) {
        throw new Error("The rendered diagram is not a valid SVG.");
    }
    return svgRoot;
}

// Lays out the DOT as SVG, then reads the nodes and datapaths from it
export async function buildDiagram(savedDiagram: SavedDiagram, id: number): Promise<Diagram> {
    const svg = await renderSvg(savedDiagram.dot);
    const svgRoot = parseSvgRoot(svg);
    const { nodes, datapaths } = readDiagramGraph(svgRoot);
    return { ...savedDiagram, id, svg, svgRoot, nodes, datapaths };
}
