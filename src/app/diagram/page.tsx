'use client'

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Center, Loader, useComputedColorScheme } from "@mantine/core";
import { useLocalStorage, useMediaQuery } from "@mantine/hooks";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { DiagramCanvas } from "@/components/diagramWorkspace/DiagramCanvas";
import { FilesUnavailableNotice } from "@/components/diagramWorkspace/FilesUnavailableNotice";
import { SettingsPanel } from "@/components/diagramWorkspace/SettingsPanel";
import { WorkspaceToolbar } from "@/components/diagramWorkspace/WorkspaceToolbar";
import classes from "@/components/diagramWorkspace/DiagramWorkspace.module.css";
import { toDisplayedError } from "@/diagramApi/displayedError";
import type { ColorSchemeFamily } from "@/diagramRendering/colorSchemes";
import { DOWNLOAD_FILE_STEM, downloadBlob, downloadGraphml, exportYed } from "@/diagramRendering/downloads";
import { convertSvgToPngBlob, createSvgBlob } from "@/diagramRendering/graphvizRenderer";
import { useDiagramSession } from "@/diagramSession/DiagramSessionProvider";

const ZOOM_ANIMATION_MILLISECONDS = 200;

export default function DiagramWorkspacePage() {
    const router = useRouter();
    const {
        diagram, restoreSavedDiagram, changeColorSchemeFamily, isChangingColorScheme, hasSelectedFiles, requestYedGraphml,
    } = useDiagramSession();
    const zoomControlsRef = useRef<ReactZoomPanPinchRef>(null);
    const canvasElementRef = useRef<HTMLDivElement>(null);
    const theme = useComputedColorScheme("light");
    const isNarrowScreen = useMediaQuery("(max-width: 48em)") ?? false;
    const [isSettingsOpen, setIsSettingsOpen] = useLocalStorage({ key: "openrvdas-diagram:settings-open", defaultValue: false });
    const [workspaceErrorMessage, setWorkspaceErrorMessage] = useState<string | null>(null);

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

    const svg = diagram.svgByTheme[theme];

    async function exportPng() {
        // The SVG is transparent, so the PNG gets the background it is shown on
        const backgroundColor = canvasElementRef.current
            ? getComputedStyle(canvasElementRef.current).backgroundColor
            : "white";
        try {
            downloadBlob(await convertSvgToPngBlob(svg, backgroundColor), `${DOWNLOAD_FILE_STEM}.png`);
        } catch (error) {
            console.error(error);
            setWorkspaceErrorMessage("The PNG could not be created. Try the SVG export instead.");
        }
    }

    async function changeColorScheme(colorSchemeFamily: ColorSchemeFamily) {
        setWorkspaceErrorMessage(null);
        try {
            await changeColorSchemeFamily(colorSchemeFamily);
        } catch (error) {
            setWorkspaceErrorMessage(`The color scheme could not be changed. ${toDisplayedError(error).message}`);
        }
    }

    async function exportYedGraphml() {
        setWorkspaceErrorMessage(null);
        try {
            exportYed(await requestYedGraphml());
        } catch (error) {
            setWorkspaceErrorMessage(`The yEd file could not be created. ${toDisplayedError(error).message}`);
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
                onExportSvg={() => downloadBlob(createSvgBlob(svg), `${DOWNLOAD_FILE_STEM}.svg`)}
                onExportPng={exportPng}
                onExportGraphml={() => downloadGraphml(diagram.graphml)}
                onExportYed={exportYedGraphml}
                canExportYed={hasSelectedFiles}
                onToggleSettings={() => setIsSettingsOpen((wasOpen) => !wasOpen)}
            />
            {!hasSelectedFiles && <FilesUnavailableNotice onAddFiles={() => router.push("/")} />}
            {workspaceErrorMessage && (
                <Alert color="red" withCloseButton onClose={() => setWorkspaceErrorMessage(null)} radius={0}>
                    {workspaceErrorMessage}
                </Alert>
            )}
            <div className={classes.body}>
                {/* Keyed by diagram, not theme, so switching theme swaps the drawing and keeps zoom and pan */}
                <DiagramCanvas key={diagram.id} svg={svg} graph={diagram.graph} ref={zoomControlsRef} canvasElementRef={canvasElementRef} />
                <SettingsPanel
                    isOpen={isSettingsOpen}
                    isNarrowScreen={isNarrowScreen}
                    onClose={() => setIsSettingsOpen(false)}
                    colorSchemeFamily={diagram.colorSchemeFamily}
                    onColorSchemeFamilyChange={changeColorScheme}
                    isChangingColorScheme={isChangingColorScheme}
                    canChangeColorScheme={hasSelectedFiles}
                />
            </div>
        </div>
    );
}
