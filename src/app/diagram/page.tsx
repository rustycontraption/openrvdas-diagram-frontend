'use client'

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Center, Loader } from "@mantine/core";
import { useLocalStorage, useMediaQuery } from "@mantine/hooks";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { DiagramCanvas } from "@/components/diagramWorkspace/DiagramCanvas";
import { SettingsPanel } from "@/components/diagramWorkspace/SettingsPanel";
import { WorkspaceToolbar } from "@/components/diagramWorkspace/WorkspaceToolbar";
import classes from "@/components/diagramWorkspace/DiagramWorkspace.module.css";
import { DOWNLOAD_FILE_STEM, downloadBlob, downloadGraphml } from "@/diagramRendering/downloads";
import { convertSvgToPngBlob, createSvgBlob } from "@/diagramRendering/graphvizRenderer";
import { useDiagramSession } from "@/diagramSession/DiagramSessionProvider";

const ZOOM_ANIMATION_MILLISECONDS = 200;

export default function DiagramWorkspacePage() {
    const router = useRouter();
    const { diagram, restoreSavedDiagram } = useDiagramSession();
    const zoomControlsRef = useRef<ReactZoomPanPinchRef>(null);
    const isNarrowScreen = useMediaQuery("(max-width: 48em)") ?? false;
    const [isSettingsOpen, setIsSettingsOpen] = useLocalStorage({ key: "openrvdas-diagram:settings-open", defaultValue: false });
    const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(null);

    // Arriving here without a diagram (a reload or a shared link) restores the last one, or returns to the upload page
    useEffect(() => {
        if (diagram) {
            return;
        }
        restoreSavedDiagram()
            .then((wasRestored) => { if (!wasRestored) router.replace("/"); })
            .catch(() => router.replace("/"));
    }, [diagram, restoreSavedDiagram, router]);

    if (!diagram) {
        return <Center h="60vh"><Loader /></Center>;
    }

    async function exportPng() {
        if (!diagram) {
            return;
        }
        try {
            downloadBlob(await convertSvgToPngBlob(diagram.svg), `${DOWNLOAD_FILE_STEM}.png`);
        } catch (error) {
            console.error(error);
            setExportErrorMessage("The PNG could not be created. Try the SVG export instead.");
        }
    }

    return (
        <div className={classes.workspace}>
            <WorkspaceToolbar
                summary={diagram.summary}
                isSettingsOpen={isSettingsOpen}
                onEditFiles={() => router.push("/")}
                onZoomIn={() => zoomControlsRef.current?.zoomIn(undefined, ZOOM_ANIMATION_MILLISECONDS)}
                onZoomOut={() => zoomControlsRef.current?.zoomOut(undefined, ZOOM_ANIMATION_MILLISECONDS)}
                onFitToScreen={() => zoomControlsRef.current?.fitToView({ animationTime: ZOOM_ANIMATION_MILLISECONDS })}
                onExportSvg={() => downloadBlob(createSvgBlob(diagram.svg), `${DOWNLOAD_FILE_STEM}.svg`)}
                onExportPng={exportPng}
                onExportGraphml={() => downloadGraphml(diagram.graphml)}
                onToggleSettings={() => setIsSettingsOpen((wasOpen) => !wasOpen)}
            />
            {exportErrorMessage && (
                <Alert color="red" withCloseButton onClose={() => setExportErrorMessage(null)} radius={0}>
                    {exportErrorMessage}
                </Alert>
            )}
            <div className={classes.body}>
                <DiagramCanvas key={diagram.svgUrl} svgUrl={diagram.svgUrl} ref={zoomControlsRef} />
                <SettingsPanel isOpen={isSettingsOpen} isNarrowScreen={isNarrowScreen} onClose={() => setIsSettingsOpen(false)} />
            </div>
        </div>
    );
}
