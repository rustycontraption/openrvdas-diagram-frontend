import { forwardRef, useLayoutEffect, useMemo, useRef, type MouseEvent, type Ref } from "react";
import { TransformComponent, TransformWrapper, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import type { ColorScheme } from "@/components/diagram/model/colorSchemes";
import { findNodeElement, readDotName, readElementsByDotName } from "@/components/diagram/model/graph";
import { paintDiagram } from "@/components/diagram/model/paintDiagram";
import classes from "./DiagramCanvas.module.css";

const MINIMUM_ZOOM = 0.05;
const MAXIMUM_ZOOM = 8;

interface DiagramCanvasProps {
    svgRoot: SVGSVGElement;
    colorScheme: ColorScheme;
    highlightedDotNames: Set<string>;
    onNodeClick: (dotName: string) => void;
    canvasElementRef?: Ref<HTMLDivElement>;
}

/**
 * Shows the diagram SVG with zoom and pan. This is the only component that changes the SVG: it paints the colors
 * of the current color scheme, and adds the highlight class to the highlighted nodes and edges. The highlight is
 * CSS, so it shows over any color scheme.
 */
export const DiagramCanvas = forwardRef<ReactZoomPanPinchRef, DiagramCanvasProps>(function DiagramCanvas(
    { svgRoot, colorScheme, highlightedDotNames, onNodeClick, canvasElementRef },
    zoomControlsRef,
) {
    const diagramContainerRef = useRef<HTMLDivElement>(null);
    const elementsByDotName = useMemo(() => readElementsByDotName(svgRoot), [svgRoot]);

    useLayoutEffect(() => {
        diagramContainerRef.current?.replaceChildren(svgRoot);
    }, [svgRoot]);

    useLayoutEffect(() => {
        paintDiagram(svgRoot, colorScheme);
    }, [svgRoot, colorScheme]);

    useLayoutEffect(() => {
        const highlightedElements = [...highlightedDotNames]
            .map((dotName) => elementsByDotName.get(dotName))
            .filter((element) => element !== undefined);
        highlightedElements.forEach((element) => element.classList.add(classes.highlighted));
        return () => highlightedElements.forEach((element) => element.classList.remove(classes.highlighted));
    }, [elementsByDotName, highlightedDotNames]);

    function reportClickedNode(event: MouseEvent<HTMLDivElement>) {
        if (!(event.target instanceof Element)) {
            return;
        }
        // The click can land on the node's border, fill or label text, so find the node group that holds it
        const nodeElement = findNodeElement(event.target);
        const dotName = nodeElement ? readDotName(nodeElement) : "";
        if (dotName !== "") {
            onNodeClick(dotName);
        }
    }

    return (
        <div className={classes.canvas} ref={canvasElementRef}>
            <TransformWrapper
                ref={zoomControlsRef}
                minScale={MINIMUM_ZOOM}
                maxScale={MAXIMUM_ZOOM}
                limitToBounds={false}
                fitOnInit="contain"
            >
                <TransformComponent wrapperClass={classes.canvasViewport}>
                    <div
                        ref={diagramContainerRef}
                        role="img"
                        aria-label="Generated OpenRVDAS logger architecture diagram"
                        className={classes.diagram}
                        onClick={reportClickedNode}
                    />
                </TransformComponent>
            </TransformWrapper>
        </div>
    );
});
