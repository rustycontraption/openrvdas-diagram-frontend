import { useLayoutEffect, useMemo, useRef, type MouseEvent } from "react";
import clsx from "clsx";
import { findConnectedElements, type DiagramGraph, type DiagramNode } from "@/diagramModel/diagramGraph";
import { NODE_ID_ATTRIBUTE, prepareInteractiveSvg } from "@/diagramRendering/interactiveSvg";
import classes from "./InteractiveDiagramSvg.module.css";

interface InteractiveDiagramSvgProps {
    svg: string;
    graph: DiagramGraph | null;
    onNodeClick?: (node: DiagramNode) => void;
}

function closestNodeId(target: EventTarget, container: HTMLElement): string | null {
    const nodeElement = target instanceof Element ? target.closest(`[${NODE_ID_ATTRIBUTE}]`) : null;
    return nodeElement && container.contains(nodeElement) ? nodeElement.getAttribute(NODE_ID_ATTRIBUTE) : null;
}

export function InteractiveDiagramSvg({ svg, graph, onNodeClick }: InteractiveDiagramSvgProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const preparedSvg = useMemo(() => prepareInteractiveSvg(svg, graph), [svg, graph]);

    useLayoutEffect(() => {
        containerRef.current?.replaceChildren(...(preparedSvg ? [preparedSvg] : []));
    }, [preparedSvg]);

    function handleClick(event: MouseEvent<HTMLDivElement>) {
        const container = containerRef.current;
        if (!container || !graph) {
            return;
        }
        const nodeId = closestNodeId(event.target, container);
        const node = nodeId !== null ? graph.nodesById.get(nodeId) : undefined;
        if (node) {
            console.log("Diagram node clicked", node);
            console.log("Connected to clicked node", findConnectedElements(graph, node.id));
            onNodeClick?.(node);
            return;
        }
    }

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Generated OpenRVDAS data-flow diagram"
            className={clsx(classes.diagram, { [classes.nodesClickable]: onNodeClick !== undefined })}
            onClick={handleClick}
        />
    );
}
