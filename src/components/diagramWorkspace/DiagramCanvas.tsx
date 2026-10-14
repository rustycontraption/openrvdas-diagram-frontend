import { forwardRef } from "react";
import { TransformComponent, TransformWrapper, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import classes from "./DiagramWorkspace.module.css";

const MINIMUM_ZOOM = 0.05;
const MAXIMUM_ZOOM = 8;

interface DiagramCanvasProps {
    svgUrl: string;
}

/** The diagram, fitted to the available space on first show, with wheel/pinch zoom and drag to pan. */
export const DiagramCanvas = forwardRef<ReactZoomPanPinchRef, DiagramCanvasProps>(function DiagramCanvas({ svgUrl }, zoomControlsRef) {
    return (
        <div className={classes.canvas}>
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
