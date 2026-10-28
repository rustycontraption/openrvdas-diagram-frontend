import { useLayoutEffect, useMemo, useRef, type MouseEvent } from "react";
import { prepareInteractiveSvg, setDatapathAppearance, type DatapathGroup } from "@/diagramRendering/diagramSvg";
import classes from "./InteractiveDiagramSvg.module.css";

interface InteractiveDiagramSvgProps {
    svg: string;
}

export function InteractiveDiagramSvg({ svg }: InteractiveDiagramSvgProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const highlightedDatapathGroups = useRef<DatapathGroup[]>([]);
    const preparedSvg = useMemo(() => prepareInteractiveSvg(svg), [svg]);

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
            aria-label="Generated OpenRVDAS data-flow diagram"
            className={classes.diagram}
            onClick={handleClick}
        />
    );
}
