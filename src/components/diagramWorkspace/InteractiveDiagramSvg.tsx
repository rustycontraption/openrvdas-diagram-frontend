import { useLayoutEffect, useRef, type MouseEvent } from "react";
import { setDatapathAppearance, type DatapathGroup, type PreparedSvg } from "@/diagramRendering/diagramSvg";
import classes from "./InteractiveDiagramSvg.module.css";

interface InteractiveDiagramSvgProps {
    preparedSvg: PreparedSvg | null;
}

export function InteractiveDiagramSvg({ preparedSvg }: InteractiveDiagramSvgProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const highlightedDatapathGroups = useRef<DatapathGroup[]>([]);

    useLayoutEffect(() => {
        containerRef.current?.replaceChildren(...(preparedSvg ? [preparedSvg.svgRoot] : []));
    }, [preparedSvg]);

    function handleClick(event: MouseEvent<HTMLDivElement>) {
        if (!preparedSvg || !(event.target instanceof Element)) {
            return;
        }
        // The click can land on the node's border, fill or label text, so find the node group that holds it
        const nodeElement = event.target.closest<SVGGElement>("g.node");
        if (!nodeElement || !preparedSvg.svgRoot.contains(nodeElement)) {
            return;
        }

        const datapathGroups = preparedSvg.datapathGroupsByElement.get(nodeElement) ?? [];
        setDatapathAppearance(highlightedDatapathGroups.current, classes.highlighted, false);
        setDatapathAppearance(datapathGroups, classes.highlighted, true);
        highlightedDatapathGroups.current = datapathGroups;
    }

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Generated OpenRVDAS logger architecture diagram"
            className={classes.diagram}
            onClick={handleClick}
        />
    );
}
