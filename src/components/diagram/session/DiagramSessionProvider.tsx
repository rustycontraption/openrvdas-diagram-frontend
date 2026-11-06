'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useLocalStorage } from "@mantine/hooks";
import { requestDiagram } from "@/components/diagram/api/client";
import type { YamlFile } from "@/components/diagram/api/types";
import {
    COLOR_SCHEMES_BY_FAMILY,
    DEFAULT_COLOR_SCHEME_FAMILY,
    isColorSchemeFamily,
    type ColorSchemeFamily,
} from "@/components/diagram/model/colorSchemes";
import { buildDiagram, mapThemes, type Diagram, type SavedDiagram } from "@/components/diagram/model/diagram";
import { loadSavedDiagram, saveDiagram } from "./savedDiagram";

const COLOR_SCHEME_FAMILY_STORAGE_KEY = "openrvdas-diagram:color-scheme-family";

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

async function readYamlFiles(files: File[]): Promise<YamlFile[]> {
    return Promise.all(files.map(async (file) => ({ name: file.name, content: await file.text() })));
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
        const id = keepView && currentDiagramId.current !== null ? currentDiagramId.current : nextDiagramId.current++;
        const diagram = await buildDiagram(savedDiagram, id);
        currentDiagramId.current = id;
        setDiagram(diagram);
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
