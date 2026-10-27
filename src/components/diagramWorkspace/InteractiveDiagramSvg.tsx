import { useLayoutEffect, useMemo, useRef } from "react";
import { prepareInteractiveSvg } from "@/diagramRendering/diagramSvg";
import classes from "./InteractiveDiagramSvg.module.css";

interface InteractiveDiagramSvgProps {
    svg: string;
}

export function InteractiveDiagramSvg({ svg }: InteractiveDiagramSvgProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const preparedSvg = useMemo(() => prepareInteractiveSvg(svg), [svg]);

    useLayoutEffect(() => {
        containerRef.current?.replaceChildren(...(preparedSvg ? [preparedSvg.svgRoot] : []));
    }, [preparedSvg]);

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Generated OpenRVDAS data-flow diagram"
            className={classes.diagram}
        />
    );
}
