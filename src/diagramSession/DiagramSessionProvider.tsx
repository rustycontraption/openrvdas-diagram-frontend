'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DIAGRAM_THEMES, type DiagramTheme } from "@/diagramRendering/colorSchemes";
import { createSvgBlob, renderSvg } from "@/diagramRendering/graphvizRenderer";

const SAVED_DIAGRAM_STORAGE_KEY = "openrvdas-diagram:last-diagram";

type ByTheme<Value> = Record<DiagramTheme, Value>;

export interface Diagram {
    /** Changes for every new diagram, but not when only the theme changes */
    id: number;
    dotByTheme: ByTheme<string>;
    svgByTheme: ByTheme<string>;
    svgUrlByTheme: ByTheme<string>;
    graphml: string;
    summary: string;
}

/** The parts of a diagram that can be saved and redrawn after a page reload. */
type SavedDiagram = Pick<Diagram, "dotByTheme" | "graphml" | "summary">;

function mapThemes<Value>(valueForTheme: (theme: DiagramTheme) => Value): ByTheme<Value> {
    return Object.fromEntries(DIAGRAM_THEMES.map((theme) => [theme, valueForTheme(theme)])) as ByTheme<Value>;
}

function isSavedDiagram(value: unknown): value is SavedDiagram {
    const dotByTheme = (value as Partial<SavedDiagram> | null)?.dotByTheme;
    return DIAGRAM_THEMES.every((theme) => typeof dotByTheme?.[theme] === "string");
}

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
        const storedDiagram = storedText ? JSON.parse(storedText) : null;
        // Diagrams saved by an older version of the site have no per-theme DOT and can't be redrawn
        return isSavedDiagram(storedDiagram) ? storedDiagram : null;
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
    const nextDiagramId = useRef(1);

    // Release the previous SVGs' object URLs whenever the diagram is replaced
    useEffect(() => {
        return () => {
            if (diagram) {
                DIAGRAM_THEMES.forEach((theme) => URL.revokeObjectURL(diagram.svgUrlByTheme[theme]));
            }
        };
    }, [diagram]);

    // Both themes are drawn up front, so switching the site theme swaps the image instantly
    const showDiagram = useCallback(async (savedDiagram: SavedDiagram) => {
        const renderedSvgs = await Promise.all(DIAGRAM_THEMES.map((theme) => renderSvg(savedDiagram.dotByTheme[theme])));
        const svgByTheme = mapThemes((theme) => renderedSvgs[DIAGRAM_THEMES.indexOf(theme)]);
        setDiagram({
            ...savedDiagram,
            id: nextDiagramId.current++,
            svgByTheme,
            svgUrlByTheme: mapThemes((theme) => URL.createObjectURL(createSvgBlob(svgByTheme[theme]))),
        });
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
