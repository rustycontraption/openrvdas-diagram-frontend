import { useLayoutEffect, useMemo, useRef, type MouseEvent } from "react";
import { prepareInteractiveSvg, type DatapathGroup } from "@/diagramRendering/diagramSvg";
import classes from "./InteractiveDiagramSvg.module.css";

interface InteractiveDiagramSvgProps {
    svg: string;
    onNodeClick?: (nodeElement: SVGGElement, datapathGroups: DatapathGroup[]) => void;
}

export function InteractiveDiagramSvg({ svg, onNodeClick }: InteractiveDiagramSvgProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const preparedSvg = useMemo(() => prepareInteractiveSvg(svg), [svg]);

    useLayoutEffect(() => {
        containerRef.current?.replaceChildren(...(preparedSvg ? [preparedSvg.svgRoot] : []));
    }, [preparedSvg]);

    function handleClick(event: MouseEvent<HTMLDivElement>) {
        if (!preparedSvg || !onNodeClick || !(event.target instanceof Element)) {
            return;
        }
        // The click can land on the node's border, fill or label text, so find the node group that holds it
        const nodeElement = event.target.closest<SVGGElement>("g.node");
        if (!nodeElement || !preparedSvg.svgRoot.contains(nodeElement)) {
            return;
        }
        onNodeClick(nodeElement, preparedSvg.datapathGroupsByElement.get(nodeElement) ?? []);
    }

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Generated OpenRVDAS data-flow diagram"
            className={classes.diagram}
            onClick={handleClick}
        />
    );
}
