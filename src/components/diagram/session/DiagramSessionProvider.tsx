'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { requestDiagram } from "@/components/diagram/api/client";
import type { YamlFile } from "@/components/diagram/api/types";
import { buildDiagram, type Diagram, type SavedDiagram } from "@/components/diagram/model/diagram";
import { loadSavedDiagram, saveDiagram } from "./savedDiagram";

interface DiagramSession {
    configFiles: File[];
    templateFiles: File[];
    setConfigFiles: (files: File[]) => void;
    setTemplateFiles: (files: File[]) => void;
    hasSelectedFiles: boolean;
    diagram: Diagram | null;
    generateDiagram: () => Promise<void>;
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
    const nextDiagramId = useRef(1);
    // Only the most recent request may replace the diagram, in case requests overlap
    const latestRequestNumber = useRef(0);

    const showDiagram = useCallback(async (savedDiagram: SavedDiagram) => {
        const diagram = await buildDiagram(savedDiagram, nextDiagramId.current++);
        setDiagram(diagram);
        saveDiagram(savedDiagram);
    }, []);

    const generateDiagram = useCallback(async () => {
        const requestNumber = ++latestRequestNumber.current;
        const result = await requestDiagram({
            configFiles: await readYamlFiles(configFiles),
            templateFiles: await readYamlFiles(templateFiles),
            graphmlFormats: ["generic", "yed"]
        });
        if (requestNumber !== latestRequestNumber.current) {
            return;
        }
        await showDiagram({
            dot: result.dot,
            graphml: result.graphml,
            summary: describeUpload(configFiles.length, templateFiles.length),
        });
    }, [configFiles, templateFiles, showDiagram]);

    const hasSelectedFiles = configFiles.length > 0;

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
        hasSelectedFiles,
        diagram,
        generateDiagram,
        restoreSavedDiagram,
    }), [
        configFiles, templateFiles, hasSelectedFiles, diagram, generateDiagram, restoreSavedDiagram,
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
