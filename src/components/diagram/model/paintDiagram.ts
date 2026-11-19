import type { ColorScheme } from "./colorSchemes";
import { readDiagramEdge, readDotName } from "./graph";
import { parseDiagramSvg } from "./svg";

const GOLDEN_RATIO_CONJUGATE = 0.618033988749895;
const GROUP_FILL_BACKGROUND_MIX = 0.8;

// Loggers sit between a colored source and a colored destination, so they stay neutral
const COLORED_NODE_SELECTOR = "g.node.source, g.node.destination";
const NODE_SELECTOR = "g.node";
const EDGE_SELECTOR = "g.edge";
const GROUP_SELECTOR = "g.cluster";

function greatestCommonDivisor(first: number, second: number): number {
    return second === 0 ? first : greatestCommonDivisor(second, first % second);
}

/**
 * About 0.618 of the list (the golden ratio), so consecutive nodes land far apart, and sharing no factor with
 * colorCount, so every color is used once before any repeats.
 */
function colorStep(colorCount: number): number {
    const targetStep = Math.round(colorCount * GOLDEN_RATIO_CONJUGATE);
    const steps = Array.from({ length: colorCount }, (_, stepIndex) => stepIndex + 1);
    const stepsNearestFirst = steps.sort((first, second) => Math.abs(first - targetStep) - Math.abs(second - targetStep));
    return stepsNearestFirst.find((step) => greatestCommonDivisor(step, colorCount) === 1)!;
}

function pickColor(colors: readonly string[], index: number): string {
    return colors[(index * colorStep(colors.length)) % colors.length];
}

function hexToRgb(hexColor: string): number[] {
    const hexDigits = hexColor.replace("#", "");
    return [0, 2, 4].map((channelStart) => parseInt(hexDigits.slice(channelStart, channelStart + 2), 16));
}

function rgbToHex(channels: number[]): string {
    return `#${channels.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

function mixColors(color: string, otherColor: string, amount: number): string {
    const otherChannels = hexToRgb(otherColor);
    return rgbToHex(hexToRgb(color).map((channel, channelIndex) => channel + (otherChannels[channelIndex] - channel) * amount));
}

function assignNodeColors(svgRoot: SVGSVGElement, colorScheme: ColorScheme): Map<string, string> {
    const coloredNodeElements = [...svgRoot.querySelectorAll<SVGGElement>(COLORED_NODE_SELECTOR)];
    return new Map(coloredNodeElements.map((nodeElement, coloredNodeIndex) =>
        [readDotName(nodeElement), pickColor(colorScheme.nodeColors, coloredNodeIndex)]));
}

function paintGroups(svgRoot: SVGSVGElement, colorScheme: ColorScheme) {
    svgRoot.querySelectorAll(GROUP_SELECTOR).forEach((groupElement, groupIndex) => {
        const groupColor = mixColors(
            pickColor(colorScheme.nodeColors, groupIndex), colorScheme.backgroundColor, GROUP_FILL_BACKGROUND_MIX);
        groupElement.querySelectorAll(":scope > path, :scope > polygon").forEach((boxElement) => {
            boxElement.setAttribute("fill", groupColor);
            boxElement.setAttribute("stroke", groupColor);
        });
    });
}

// A node is drawn as a filled background shape, its label, then its border on top
function paintNodes(svgRoot: SVGSVGElement, colorScheme: ColorScheme, colorByNodeName: Map<string, string>) {
    svgRoot.querySelectorAll<SVGGElement>(NODE_SELECTOR).forEach((nodeElement) => {
        const shapeElements = [...nodeElement.querySelectorAll(":scope > path, :scope > polygon")];
        const backgroundElement = shapeElements.at(0);
        const borderElement = shapeElements.at(-1);
        backgroundElement?.setAttribute("fill", colorScheme.nodeFillColor);
        borderElement?.setAttribute("stroke",
            colorByNodeName.get(readDotName(nodeElement)) ?? colorScheme.defaultNodeBorderColor);
    });
}

// An edge shares the color of the source it leaves, or else the destination it reaches
function paintEdges(svgRoot: SVGSVGElement, colorScheme: ColorScheme, colorByNodeName: Map<string, string>) {
    svgRoot.querySelectorAll<SVGGElement>(EDGE_SELECTOR).forEach((edgeElement) => {
        const edge = readDiagramEdge(edgeElement);
        const edgeColor = (edge && (colorByNodeName.get(edge.tailNodeName) ?? colorByNodeName.get(edge.headNodeName)))
            ?? colorScheme.defaultEdgeColor;
        edgeElement.querySelectorAll(":scope > path").forEach((lineElement) => lineElement.setAttribute("stroke", edgeColor));
        edgeElement.querySelectorAll(":scope > polygon").forEach((arrowheadElement) => {
            arrowheadElement.setAttribute("fill", edgeColor);
            arrowheadElement.setAttribute("stroke", edgeColor);
        });
    });
}

function paintText(svgRoot: SVGSVGElement, colorScheme: ColorScheme) {
    svgRoot.querySelectorAll("text").forEach((textElement) => textElement.setAttribute("fill", colorScheme.textColor));
}

/**
 * Colors a diagram SVG in place. The SVG from the diagram service only supplies the layout; every color on screen
 * and in the exports comes from here.
 */
export function paintDiagram(svgRoot: SVGSVGElement, colorScheme: ColorScheme) {
    const colorByNodeName = assignNodeColors(svgRoot, colorScheme);
    paintGroups(svgRoot, colorScheme);
    paintNodes(svgRoot, colorScheme, colorByNodeName);
    paintEdges(svgRoot, colorScheme, colorByNodeName);
    paintText(svgRoot, colorScheme);
}

// For exports: colors a fresh copy, so the file never carries the on-screen highlight
export function paintSvgText(svg: string, colorScheme: ColorScheme): string {
    const svgRoot = parseDiagramSvg(svg);
    if (!svgRoot) {
        throw new Error("The rendered diagram is not a valid SVG.");
    }
    paintDiagram(svgRoot, colorScheme);
    return new XMLSerializer().serializeToString(svgRoot);
}
