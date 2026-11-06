import { DIAGRAM_THEMES, type ColorSchemeFamily, type DiagramTheme } from "./colorSchemes";
import { readDiagramGraph, type Datapath, type DiagramNode } from "./graph";
import { parseDiagramSvg, renderSvg } from "./svg";

export type ByTheme<Value> = Record<DiagramTheme, Value>;

export interface Diagram {
    id: number;
    colorSchemeFamily: ColorSchemeFamily;
    dotByTheme: ByTheme<string>;
    // Kept as text for exports, so they never carry highlighting
    svgByTheme: ByTheme<string>;
    svgRootByTheme: ByTheme<SVGSVGElement>;
    nodes: DiagramNode[];
    datapaths: Datapath[];
    graphml: string;
    summary: string;
}

// The parts of a diagram that come from the diagram service; everything else is rebuilt from them
export type SavedDiagram = Pick<Diagram, "colorSchemeFamily" | "dotByTheme" | "graphml" | "summary">;

export function mapThemes<Value>(valueForTheme: (theme: DiagramTheme) => Value): ByTheme<Value> {
    return Object.fromEntries(DIAGRAM_THEMES.map((theme) => [theme, valueForTheme(theme)])) as ByTheme<Value>;
}

function parseSvgRoot(svg: string): SVGSVGElement {
    const svgRoot = parseDiagramSvg(svg);
    if (!svgRoot) {
        throw new Error("The rendered diagram is not a valid SVG.");
    }
    return svgRoot;
}

// Lays out each theme's DOT as SVG, then reads the nodes and datapaths from it
export async function buildDiagram(savedDiagram: SavedDiagram, id: number): Promise<Diagram> {
    const renderedSvgs = await Promise.all(DIAGRAM_THEMES.map((theme) => renderSvg(savedDiagram.dotByTheme[theme])));
    const svgByTheme = mapThemes((theme) => renderedSvgs[DIAGRAM_THEMES.indexOf(theme)]);
    const svgRootByTheme = mapThemes((theme) => parseSvgRoot(svgByTheme[theme]));
    const { nodes, datapaths } = readDiagramGraph(svgRootByTheme.light);
    return { ...savedDiagram, id, svgByTheme, svgRootByTheme, nodes, datapaths };
}
