'use client'

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, useComputedColorScheme } from "@mantine/core";
import { useLocalStorage, useMediaQuery } from "@mantine/hooks";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { toDisplayedError } from "@/components/diagram/api/errors";
import type { ColorSchemeFamily } from "@/components/diagram/model/colorSchemes";
import type { Diagram } from "@/components/diagram/model/diagram";
import { findDatapathDotNames } from "@/components/diagram/model/graph";
import { ColorSchemeSettings } from "./ColorSchemeSettings";
import { DiagramCanvas } from "./DiagramCanvas";
import { DOWNLOAD_FILE_STEM, convertSvgToPngBlob, createGraphmlBlob, createSvgBlob, downloadBlob } from "./downloads";
import { FilesUnavailableNotice } from "./FilesUnavailableNotice";
import { NodeFilters } from "./NodeFilters";
import { SettingsPanel } from "./SettingsPanel";
import { WorkspaceToolbar } from "./WorkspaceToolbar";
import classes from "./DiagramWorkspace.module.css";

const ZOOM_ANIMATION_MILLISECONDS = 200;

interface DiagramWorkspaceProps {
    diagram: Diagram;
    hasSelectedFiles: boolean;
    isChangingColorScheme: boolean;
    changeColorSchemeFamily: (colorSchemeFamily: ColorSchemeFamily) => Promise<void>;
    requestYedGraphml: () => Promise<string>;
}

/**
 * The toolbar, canvas and settings for one diagram. It owns the workspace state, including which nodes are
 * selected, and passes it to its children as props. The page gives it a new key for each new diagram, which
 * resets the selection and zoom.
 */
export function DiagramWorkspace({
    diagram, hasSelectedFiles, isChangingColorScheme, changeColorSchemeFamily, requestYedGraphml,
}: DiagramWorkspaceProps) {
    const router = useRouter();
    const zoomControlsRef = useRef<ReactZoomPanPinchRef>(null);
    const canvasElementRef = useRef<HTMLDivElement>(null);
    const theme = useComputedColorScheme("light");
    const isNarrowScreen = useMediaQuery("(max-width: 48em)") ?? false;
    const [isSettingsOpen, setIsSettingsOpen] = useLocalStorage({ key: "openrvdas-diagram:settings-open", defaultValue: false });
    const [workspaceErrorMessage, setWorkspaceErrorMessage] = useState<string | null>(null);
    const [selectedNodeNames, setSelectedNodeNames] = useState<string[]>([]);

    const svg = diagram.svgByTheme[theme];
    const highlightedDotNames = useMemo(
        () => findDatapathDotNames(diagram.datapaths, selectedNodeNames),
        [diagram.datapaths, selectedNodeNames],
    );

    function selectOnlyNode(dotName: string) {
        setSelectedNodeNames([dotName]);
    }

    function toggleNode(dotName: string) {
        setSelectedNodeNames((previouslySelectedNames) => previouslySelectedNames.includes(dotName)
            ? previouslySelectedNames.filter((selectedName) => selectedName !== dotName)
            : [...previouslySelectedNames, dotName]);
    }

    function deselectNode(dotName: string) {
        setSelectedNodeNames((previouslySelectedNames) =>
            previouslySelectedNames.filter((selectedName) => selectedName !== dotName));
    }

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
            downloadBlob(createGraphmlBlob(await requestYedGraphml()), `${DOWNLOAD_FILE_STEM}-yed.graphml`);
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
                onExportGraphml={() => downloadBlob(createGraphmlBlob(diagram.graphml), `${DOWNLOAD_FILE_STEM}.graphml`)}
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
                <DiagramCanvas
                    ref={zoomControlsRef}
                    canvasElementRef={canvasElementRef}
                    svgRoot={diagram.svgRootByTheme[theme]}
                    highlightedDotNames={highlightedDotNames}
                    onNodeClick={selectOnlyNode}
                />
                <SettingsPanel isOpen={isSettingsOpen} isNarrowScreen={isNarrowScreen} onClose={() => setIsSettingsOpen(false)}>
                    <ColorSchemeSettings
                        colorSchemeFamily={diagram.colorSchemeFamily}
                        onColorSchemeFamilyChange={changeColorScheme}
                        isChangingColorScheme={isChangingColorScheme}
                        canChangeColorScheme={hasSelectedFiles}
                    />
                    <NodeFilters
                        nodes={diagram.nodes}
                        selectedNodeNames={selectedNodeNames}
                        onToggleNode={toggleNode}
                        onDeselectNode={deselectNode}
                    />
                </SettingsPanel>
            </div>
        </div>
    );
}
