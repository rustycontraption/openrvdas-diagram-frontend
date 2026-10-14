'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createSvgBlob, renderSvg } from "@/diagramRendering/graphvizRenderer";

const SAVED_DIAGRAM_STORAGE_KEY = "openrvdas-diagram:last-diagram";

export interface Diagram {
    svg: string;
    svgUrl: string;
    dot: string;
    graphml: string;
    summary: string;
}

/** The parts of a diagram that can be saved and redrawn after a page reload. */
type SavedDiagram = Pick<Diagram, "dot" | "graphml" | "summary">;

interface DiagramSession {
    configFiles: File[];
    templateFiles: File[];
    setConfigFiles: (files: File[]) => void;
    setTemplateFiles: (files: File[]) => void;
    diagram: Diagram | null;
    showDiagram: (savedDiagram: SavedDiagram) => Promise<void>;
    restoreSavedDiagram: () => Promise<boolean>;
}

const DiagramSessionContext = createContext<DiagramSession | null>(null);

function pluralize(count: number, singular: string): string {
    return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

export function describeUpload(configCount: number, templateCount: number): string {
    return `${pluralize(configCount, "config file")} · ${pluralize(templateCount, "template file")}`;
}

function saveDiagram(savedDiagram: SavedDiagram) {
    try {
        sessionStorage.setItem(SAVED_DIAGRAM_STORAGE_KEY, JSON.stringify(savedDiagram));
    } catch {
        // Storage can be unavailable or full; the diagram just won't survive a reload
    }
}

function loadSavedDiagram(): SavedDiagram | null {
    try {
        const storedText = sessionStorage.getItem(SAVED_DIAGRAM_STORAGE_KEY);
        return storedText ? JSON.parse(storedText) : null;
    } catch {
        return null;
    }
}

/**
 * Shares the chosen files and the generated diagram between the upload page and the diagram workspace,
 * so going back to edit the files keeps them selected.
 */
export function DiagramSessionProvider({ children }: { children: React.ReactNode }) {
    const [configFiles, setConfigFiles] = useState<File[]>([]);
    const [templateFiles, setTemplateFiles] = useState<File[]>([]);
    const [diagram, setDiagram] = useState<Diagram | null>(null);

    // Release the previous SVG's object URL whenever the diagram is replaced
    useEffect(() => {
        return () => {
            if (diagram) {
                URL.revokeObjectURL(diagram.svgUrl);
            }
        };
    }, [diagram]);

    const showDiagram = useCallback(async (savedDiagram: SavedDiagram) => {
        const svg = await renderSvg(savedDiagram.dot);
        setDiagram({ ...savedDiagram, svg, svgUrl: URL.createObjectURL(createSvgBlob(svg)) });
        saveDiagram(savedDiagram);
    }, []);

    const restoreSavedDiagram = useCallback(async () => {
        const savedDiagram = loadSavedDiagram();
        if (!savedDiagram) {
            return false;
        }
        await showDiagram(savedDiagram);
        return true;
    }, [showDiagram]);

    const session = useMemo<DiagramSession>(() => ({
        configFiles,
        templateFiles,
        setConfigFiles,
        setTemplateFiles,
        diagram,
        showDiagram,
        restoreSavedDiagram,
    }), [configFiles, templateFiles, diagram, showDiagram, restoreSavedDiagram]);

    return <DiagramSessionContext.Provider value={session}>{children}</DiagramSessionContext.Provider>;
}

export function useDiagramSession(): DiagramSession {
    const session = useContext(DiagramSessionContext);
    if (!session) {
        throw new Error("useDiagramSession must be used inside DiagramSessionProvider");
    }
    return session;
}
