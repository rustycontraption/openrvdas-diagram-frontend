import { forwardRef, type Ref } from "react";
import { TransformComponent, TransformWrapper, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import classes from "./DiagramWorkspace.module.css";

const MINIMUM_ZOOM = 0.05;
const MAXIMUM_ZOOM = 8;

interface DiagramCanvasProps {
    svgUrl: string;
    /** The canvas element, whose themed background color is used when exporting a PNG */
    canvasElementRef?: Ref<HTMLDivElement>;
}

/** The diagram, fitted to the available space on first show, with wheel/pinch zoom and drag to pan. */
export const DiagramCanvas = forwardRef<ReactZoomPanPinchRef, DiagramCanvasProps>(function DiagramCanvas({ svgUrl, canvasElementRef }, zoomControlsRef) {
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
                    <img src={svgUrl} alt="Generated OpenRVDAS data-flow diagram" className={classes.diagramImage} draggable={false} />
                </TransformComponent>
            </TransformWrapper>
        </div>
    );
});
