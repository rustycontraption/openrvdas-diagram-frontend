'use client'

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, useComputedColorScheme } from "@mantine/core";
import { useLocalStorage, useMediaQuery } from "@mantine/hooks";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { COLOR_SCHEMES, DEFAULT_COLOR_SCHEME_FAMILY, isColorSchemeFamily } from "@/components/diagram/model/colorSchemes";
import type { Diagram } from "@/components/diagram/model/diagram";
import { findDatapathDotNames } from "@/components/diagram/model/graph";
import { paintSvgText } from "@/components/diagram/model/paintDiagram";
import { ColorSchemeSettings } from "./ColorSchemeSettings";
import { DiagramCanvas } from "./DiagramCanvas";
import { DOWNLOAD_FILE_STEM, convertSvgToPngBlob, createGraphmlBlob, createSvgBlob, downloadBlob } from "./downloads";
import { NodeFilters } from "./NodeFilters";
import { SettingsPanel } from "./SettingsPanel";
import { WorkspaceToolbar } from "./WorkspaceToolbar";
import classes from "./DiagramWorkspace.module.css";

const ZOOM_ANIMATION_MILLISECONDS = 200;
const COLOR_SCHEME_FAMILY_STORAGE_KEY = "openrvdas-diagram:color-scheme-family";

interface DiagramWorkspaceProps {
    diagram: Diagram;
}

/**
 * The toolbar, canvas and settings for one diagram. It owns the workspace state, including which nodes are
 * selected, and passes it to its children as props. The page gives it a new key for each new diagram, which
 * resets the selection and zoom.
 */
export function DiagramWorkspace({
    diagram,
}: DiagramWorkspaceProps) {
    const router = useRouter();
    const zoomControlsRef = useRef<ReactZoomPanPinchRef>(null);
    const canvasElementRef = useRef<HTMLDivElement>(null);
    const theme = useComputedColorScheme("light");
    const isNarrowScreen = useMediaQuery("(max-width: 48em)") ?? false;
    const [isSettingsOpen, setIsSettingsOpen] = useLocalStorage({ key: "openrvdas-diagram:settings-open", defaultValue: false });
    const [workspaceErrorMessage, setWorkspaceErrorMessage] = useState<string | null>(null);
    const [selectedNodeNames, setSelectedNodeNames] = useState<string[]>([]);
    const [filteredNodeNames, setFilteredNodeNames] = useState<string[]>([]);
    const [storedColorSchemeFamily, setColorSchemeFamily] = useLocalStorage<string>({
        key: COLOR_SCHEME_FAMILY_STORAGE_KEY,
        defaultValue: DEFAULT_COLOR_SCHEME_FAMILY,
    });

    const colorSchemeFamily = isColorSchemeFamily(storedColorSchemeFamily) ? storedColorSchemeFamily : DEFAULT_COLOR_SCHEME_FAMILY;
    const colorScheme = COLOR_SCHEMES[colorSchemeFamily][theme];
    const highlightedDotNames = useMemo(
        () => findDatapathDotNames(diagram.datapaths, selectedNodeNames),
        [diagram.datapaths, selectedNodeNames],
    );
    const filteredDotNames = useMemo(
        () => findDatapathDotNames(diagram.datapaths, filteredNodeNames),
        [diagram.datapaths, filteredNodeNames],
    );

    function handleNodeClick(dotName: string) {
        setSelectedNodeNames([dotName]);
    }

    function handleBackgroundClick() {
        setSelectedNodeNames([]);
    }

    function handleToggleNode(dotName: string) {
        setFilteredNodeNames((previouslySelectedNames) => previouslySelectedNames.includes(dotName)
            ? previouslySelectedNames.filter((selectedName) => selectedName !== dotName)
            : [...previouslySelectedNames, dotName]);
    }

    function handleDeselectNode(dotName: string) {
        setFilteredNodeNames((previouslySelectedNames) =>
            previouslySelectedNames.filter((selectedName) => selectedName !== dotName));
    }

    function handleClearFilters() {
        setFilteredNodeNames([]);
    }

    async function exportFile(formatName: string, fileName: string, createFile: () => Blob | Promise<Blob>) {
        try {
            downloadBlob(await createFile(), fileName);
        } catch (error) {
            console.error(error);
            setWorkspaceErrorMessage(`The ${formatName} file could not be created.`);
        }
    }

    function handleExportSvg() {
        return exportFile("SVG", `${DOWNLOAD_FILE_STEM}.svg`,
            () => createSvgBlob(paintSvgText(diagram.svg, colorScheme)));
    }

    function handleExportPng() {
        // The SVG is transparent, so the PNG gets the background it is shown on
        const backgroundColor = canvasElementRef.current
            ? getComputedStyle(canvasElementRef.current).backgroundColor
            : "white";
        return exportFile("PNG", `${DOWNLOAD_FILE_STEM}.png`,
            () => convertSvgToPngBlob(paintSvgText(diagram.svg, colorScheme), backgroundColor));
    }

    function handleExportGraphml() {
        return exportFile("GraphML", `${DOWNLOAD_FILE_STEM}.graphml`, () => createGraphmlBlob(diagram.graphml.generic));
    }

    function handleExportYed() {
        return exportFile("yEd", `${DOWNLOAD_FILE_STEM}-yed.graphml`, () => createGraphmlBlob(diagram.graphml.yed));
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
                onExportSvg={handleExportSvg}
                onExportPng={handleExportPng}
                onExportGraphml={handleExportGraphml}
                onExportYed={handleExportYed}
                onToggleSettings={() => setIsSettingsOpen((wasOpen) => !wasOpen)}
            />
            {workspaceErrorMessage && (
                <Alert color="red" withCloseButton onClose={() => setWorkspaceErrorMessage(null)} radius={0}>
                    {workspaceErrorMessage}
                </Alert>
            )}
            <div className={classes.body}>
                <DiagramCanvas
                    ref={zoomControlsRef}
                    canvasElementRef={canvasElementRef}
                    svgRoot={diagram.svgRoot}
                    colorScheme={colorScheme}
                    highlightedDotNames={highlightedDotNames}
                    filteredDotNames={filteredDotNames}
                    onNodeClick={handleNodeClick}
                    onBackgroundClick={handleBackgroundClick}
                />
                <SettingsPanel isOpen={isSettingsOpen} isNarrowScreen={isNarrowScreen} onClose={() => setIsSettingsOpen(false)}>
                    <ColorSchemeSettings
                        colorSchemeFamily={colorSchemeFamily}
                        onColorSchemeFamilyChange={setColorSchemeFamily}
                    />
                    <NodeFilters
                        nodes={diagram.nodes}
                        selectedNodeNames={filteredNodeNames}
                        onToggleNode={handleToggleNode}
                        onDeselectNode={handleDeselectNode}
                        onClearFilters={handleClearFilters}
                    />
                </SettingsPanel>
            </div>
        </div>
    );
}
