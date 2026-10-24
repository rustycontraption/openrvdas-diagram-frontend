import { forwardRef, type ComponentProps, type Ref } from "react";
import { TransformComponent, TransformWrapper, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { InteractiveDiagramSvg } from "./InteractiveDiagramSvg";
import classes from "./DiagramWorkspace.module.css";

const MINIMUM_ZOOM = 0.05;
const MAXIMUM_ZOOM = 8;

type DiagramCanvasProps = ComponentProps<typeof InteractiveDiagramSvg> & {
    canvasElementRef?: Ref<HTMLDivElement>;
};

export const DiagramCanvas = forwardRef<ReactZoomPanPinchRef, DiagramCanvasProps>(function DiagramCanvas({ canvasElementRef, ...diagramProps }, zoomControlsRef) {
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
                    <InteractiveDiagramSvg {...diagramProps} />
                </TransformComponent>
            </TransformWrapper>
        </div>
    );
});
