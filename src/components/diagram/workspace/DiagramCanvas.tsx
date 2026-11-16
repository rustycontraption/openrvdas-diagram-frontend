import { forwardRef, useLayoutEffect, useMemo, useRef, type MouseEvent, type PointerEvent, type Ref } from "react";
import { TransformComponent, TransformWrapper, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import type { ColorScheme } from "@/components/diagram/model/colorSchemes";
import { findNodeElement, readDotName, readElementsByDotName } from "@/components/diagram/model/graph";
import { paintDiagram } from "@/components/diagram/model/paintDiagram";
import classes from "./DiagramCanvas.module.css";

const MINIMUM_ZOOM = 0.05;
const MAXIMUM_ZOOM = 8;
// A press that moves further than this is a pan, not a click
const CLICK_MOVE_TOLERANCE_PIXELS = 5;

interface DiagramCanvasProps {
    svgRoot: SVGSVGElement;
    colorScheme: ColorScheme;
    highlightedDotNames: Set<string>;
    filteredDotNames: Set<string>;
    onNodeClick: (dotName: string) => void;
    onBackgroundClick: () => void;
    canvasElementRef?: Ref<HTMLDivElement>;
}

/**
 * Shows the diagram SVG with zoom and pan. This is the only component that changes the SVG: it paints the colors
 * of the current color scheme, adds the highlight class to the highlighted nodes and edges, and fades the nodes and
 * edges the filter leaves out. The highlight and fade are CSS, so they show over any color scheme.
 */
export const DiagramCanvas = forwardRef<ReactZoomPanPinchRef, DiagramCanvasProps>(function DiagramCanvas(
    { svgRoot, colorScheme, highlightedDotNames, filteredDotNames, onNodeClick, onBackgroundClick, canvasElementRef },
    zoomControlsRef,
) {
    const diagramContainerRef = useRef<HTMLDivElement>(null);
    const pressStartRef = useRef<{ x: number; y: number } | null>(null);
    const elementsByDotName = useMemo(() => readElementsByDotName(svgRoot), [svgRoot]);

    useLayoutEffect(() => {
        diagramContainerRef.current?.replaceChildren(svgRoot);
    }, [svgRoot]);

    useLayoutEffect(() => {
        paintDiagram(svgRoot, colorScheme);
    }, [svgRoot, colorScheme]);

    useLayoutEffect(() => {
        const highlightedElements = [...highlightedDotNames].flatMap((dotName) => elementsByDotName.get(dotName) ?? []);
        highlightedElements.forEach((element) => element.classList.add(classes.highlighted));
        return () => highlightedElements.forEach((element) => element.classList.remove(classes.highlighted));
    }, [elementsByDotName, highlightedDotNames]);

    useLayoutEffect(() => {
        // An empty filter shows the whole diagram
        if (filteredDotNames.size === 0) {
            return;
        }
        const fadedElements = [...elementsByDotName]
            .filter(([dotName]) => !filteredDotNames.has(dotName))
            .flatMap(([, elements]) => elements);
        fadedElements.forEach((element) => element.classList.add(classes.faded));
        return () => fadedElements.forEach((element) => element.classList.remove(classes.faded));
    }, [elementsByDotName, filteredDotNames]);

    function rememberPressStart(event: PointerEvent<HTMLDivElement>) {
        pressStartRef.current = { x: event.clientX, y: event.clientY };
    }

    function wasPointerMoved(event: MouseEvent<HTMLDivElement>) {
        const pressStart = pressStartRef.current;
        return pressStart !== null
            && Math.hypot(event.clientX - pressStart.x, event.clientY - pressStart.y) > CLICK_MOVE_TOLERANCE_PIXELS;
    }

    function reportCanvasClick(event: MouseEvent<HTMLDivElement>) {
        if (wasPointerMoved(event)) {
            return;
        }
        // The click can land on the node's border, fill or label text, so find the node group that holds it
        const nodeElement = event.target instanceof Element ? findNodeElement(event.target) : null;
        const dotName = nodeElement ? readDotName(nodeElement) : "";
        if (dotName !== "") {
            onNodeClick(dotName);
        } else {
            onBackgroundClick();
        }
    }

    return (
        <div
            className={classes.canvas}
            ref={canvasElementRef}
            onPointerDown={rememberPressStart}
            onClick={reportCanvasClick}
        >
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
                    />
                </TransformComponent>
            </TransformWrapper>
        </div>
    );
});
