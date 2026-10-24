'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useLocalStorage } from "@mantine/hooks";
import { requestDiagram } from "@/diagramApi/client";
import type { YamlFile } from "@/diagramApi/types";
import { parseGenericGraphml, type DiagramGraph } from "@/diagramModel/diagramGraph";
import {
    COLOR_SCHEMES_BY_FAMILY,
    DEFAULT_COLOR_SCHEME_FAMILY,
    DIAGRAM_THEMES,
    isColorSchemeFamily,
    type ColorSchemeFamily,
    type DiagramTheme,
} from "@/diagramRendering/colorSchemes";
import { renderSvg } from "@/diagramRendering/graphvizRenderer";

const SAVED_DIAGRAM_STORAGE_KEY = "openrvdas-diagram:last-diagram";
const COLOR_SCHEME_FAMILY_STORAGE_KEY = "openrvdas-diagram:color-scheme-family";

type ByTheme<Value> = Record<DiagramTheme, Value>;

export interface Diagram {
    id: number;
    colorSchemeFamily: ColorSchemeFamily;
    dotByTheme: ByTheme<string>;
    svgByTheme: ByTheme<string>;
    graphml: string;
    /** Null when the GraphML cannot be read; the diagram is still shown, just without interaction */
    graph: DiagramGraph | null;
    summary: string;
}

type SavedDiagram = Pick<Diagram, "colorSchemeFamily" | "dotByTheme" | "graphml" | "summary">;

interface ShowDiagramOptions {
    keepView?: boolean;
}

interface DiagramSession {
    configFiles: File[];
    templateFiles: File[];
    setConfigFiles: (files: File[]) => void;
    setTemplateFiles: (files: File[]) => void;
    colorSchemeFamily: ColorSchemeFamily;
    hasSelectedFiles: boolean;
    isChangingColorScheme: boolean;
    diagram: Diagram | null;
    generateDiagram: (colorSchemeFamily: ColorSchemeFamily, options?: ShowDiagramOptions) => Promise<void>;
    changeColorSchemeFamily: (colorSchemeFamily: ColorSchemeFamily) => Promise<void>;
    requestYedGraphml: () => Promise<string>;
    restoreSavedDiagram: () => Promise<boolean>;
}

const DiagramSessionContext = createContext<DiagramSession | null>(null);

function pluralize(count: number, singular: string): string {
    return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

export function describeUpload(configCount: number, templateCount: number): string {
    return `${pluralize(configCount, "config file")} · ${pluralize(templateCount, "template file")}`;
}

function mapThemes<Value>(valueForTheme: (theme: DiagramTheme) => Value): ByTheme<Value> {
    return Object.fromEntries(DIAGRAM_THEMES.map((theme) => [theme, valueForTheme(theme)])) as ByTheme<Value>;
}

async function readYamlFiles(files: File[]): Promise<YamlFile[]> {
    return Promise.all(files.map(async (file) => ({ name: file.name, content: await file.text() })));
}

function isSavedDiagram(value: unknown): value is SavedDiagram {
    const savedDiagram = value as Partial<SavedDiagram> | null;
    return isColorSchemeFamily(savedDiagram?.colorSchemeFamily)
        && DIAGRAM_THEMES.every((theme) => typeof savedDiagram?.dotByTheme?.[theme] === "string");
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
        return isSavedDiagram(storedDiagram) ? storedDiagram : null;
    } catch {
        return null;
    }
}

export function DiagramSessionProvider({ children }: { children: React.ReactNode }) {
    const [configFiles, setConfigFiles] = useState<File[]>([]);
    const [templateFiles, setTemplateFiles] = useState<File[]>([]);
    const [diagram, setDiagram] = useState<Diagram | null>(null);
    const [isChangingColorScheme, setIsChangingColorScheme] = useState(false);
    const [storedColorSchemeFamily, setStoredColorSchemeFamily] = useLocalStorage<string>({
        key: COLOR_SCHEME_FAMILY_STORAGE_KEY,
        defaultValue: DEFAULT_COLOR_SCHEME_FAMILY,
    });
    const colorSchemeFamily = isColorSchemeFamily(storedColorSchemeFamily) ? storedColorSchemeFamily : DEFAULT_COLOR_SCHEME_FAMILY;
    const nextDiagramId = useRef(1);
    const currentDiagramId = useRef<number | null>(null);
    // Only the most recent request may replace the diagram, in case scheme changes overlap
    const latestRequestNumber = useRef(0);

    const showDiagram = useCallback(async (savedDiagram: SavedDiagram, { keepView = false }: ShowDiagramOptions = {}) => {
        const renderedSvgs = await Promise.all(DIAGRAM_THEMES.map((theme) => renderSvg(savedDiagram.dotByTheme[theme])));
        const svgByTheme = mapThemes((theme) => renderedSvgs[DIAGRAM_THEMES.indexOf(theme)]);
        const id = keepView && currentDiagramId.current !== null ? currentDiagramId.current : nextDiagramId.current++;
        currentDiagramId.current = id;
        setDiagram({
            ...savedDiagram,
            id,
            svgByTheme,
            graph: parseGenericGraphml(savedDiagram.graphml),
        });
        saveDiagram(savedDiagram);
    }, []);

    const generateDiagram = useCallback(async (family: ColorSchemeFamily, options: ShowDiagramOptions = {}) => {
        const requestNumber = ++latestRequestNumber.current;
        const colorSchemeByTheme = COLOR_SCHEMES_BY_FAMILY[family];
        const result = await requestDiagram({
            configFiles: await readYamlFiles(configFiles),
            templateFiles: await readYamlFiles(templateFiles),
            colorSchemes: Object.values(colorSchemeByTheme),
        });
        if (requestNumber !== latestRequestNumber.current) {
            return;
        }
        await showDiagram({
            colorSchemeFamily: family,
            dotByTheme: mapThemes((theme) => result.dotByColorScheme[colorSchemeByTheme[theme]]),
            graphml: result.graphml,
            summary: describeUpload(configFiles.length, templateFiles.length),
        }, options);
    }, [configFiles, templateFiles, showDiagram]);

    const hasSelectedFiles = configFiles.length > 0;

    const changeColorSchemeFamily = useCallback(async (family: ColorSchemeFamily) => {
        setStoredColorSchemeFamily(family);
        if (!hasSelectedFiles) {
            return;
        }
        setIsChangingColorScheme(true);
        try {
            await generateDiagram(family, { keepView: true });
        } finally {
            setIsChangingColorScheme(false);
        }
    }, [hasSelectedFiles, generateDiagram, setStoredColorSchemeFamily]);

    const requestYedGraphml = useCallback(async () => {
        const family = diagram?.colorSchemeFamily ?? colorSchemeFamily;
        const result = await requestDiagram({
            configFiles: await readYamlFiles(configFiles),
            templateFiles: await readYamlFiles(templateFiles),
            // The API always draws at least one scheme; only the GraphML is used here
            colorSchemes: [COLOR_SCHEMES_BY_FAMILY[family].light],
            graphmlFormat: "yed",
        });
        return result.graphml;
    }, [configFiles, templateFiles, diagram, colorSchemeFamily]);

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
        colorSchemeFamily,
        hasSelectedFiles,
        isChangingColorScheme,
        diagram,
        generateDiagram,
        changeColorSchemeFamily,
        requestYedGraphml,
        restoreSavedDiagram,
    }), [
        configFiles, templateFiles, colorSchemeFamily, hasSelectedFiles, isChangingColorScheme,
        diagram, generateDiagram, changeColorSchemeFamily, requestYedGraphml, restoreSavedDiagram,
    ]);

    return <DiagramSessionContext.Provider value={session}>{children}</DiagramSessionContext.Provider>;
}

export function useDiagramSession(): DiagramSession {
    const session = useContext(DiagramSessionContext);
    if (!session) {
        throw new Error("useDiagramSession must be used inside DiagramSessionProvider");
    }
    return session;
}
