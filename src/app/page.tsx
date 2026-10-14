'use client'

import { useEffect, useState } from "react";
import { Alert, Anchor, Button, Container, FileInput, Group, Paper, Stack, Text, Title } from "@mantine/core";
import classes from "@/components/Page.module.css";
import { requestDiagram } from "@/diagramApi/client";
import { DiagramApiError, type YamlFile } from "@/diagramApi/types";
import { convertSvgToPngBlob, createSvgBlob, renderSvg } from "@/diagramRendering/graphvizRenderer";

const YAML_FILE_TYPES = ".yml,.yaml";
const INTERNAL_ERROR_CODE = "internal_error";
const DOWNLOAD_FILE_STEM = "data-flow-generated";

interface RenderedDiagram {
    svg: string;
    svgUrl: string;
    graphml: string;
}

interface DisplayedError {
    message: string;
    referenceId?: string;
}

function toDisplayedError(error: unknown): DisplayedError {
    if (!(error instanceof DiagramApiError)) {
        console.error(error);
        return { message: "Something went wrong while generating the diagram." };
    }
    // Only unexpected errors need a reference to match the user's report to the server log
    return { message: error.message, referenceId: error.code === INTERNAL_ERROR_CODE ? error.requestId : undefined };
}

async function readYamlFiles(files: File[]): Promise<YamlFile[]> {
    return Promise.all(files.map(async (file) => ({ name: file.name, content: await file.text() })));
}

function downloadBlob(blob: Blob, fileName: string) {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(blobUrl);
}

export default function Home() {
    const [configFiles, setConfigFiles] = useState<File[]>([]);
    const [templateFiles, setTemplateFiles] = useState<File[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [displayedError, setDisplayedError] = useState<DisplayedError | null>(null);
    const [diagram, setDiagram] = useState<RenderedDiagram | null>(null);

    // Release the previous SVG's object URL whenever the diagram is replaced or cleared
    useEffect(() => {
        return () => {
            if (diagram) {
                URL.revokeObjectURL(diagram.svgUrl);
            }
        };
    }, [diagram]);

    function clearPreviousOutcome() {
        setDisplayedError(null);
        setDiagram(null);
    }

    async function generateDiagram() {
        clearPreviousOutcome();
        setIsGenerating(true);
        try {
            const result = await requestDiagram({
                configFiles: await readYamlFiles(configFiles),
                templateFiles: await readYamlFiles(templateFiles),
            });
            const svg = await renderSvg(result.dot);
            setDiagram({ svg, svgUrl: URL.createObjectURL(createSvgBlob(svg)), graphml: result.graphml });
        } catch (error) {
            setDisplayedError(toDisplayedError(error));
        } finally {
            setIsGenerating(false);
        }
    }

    async function downloadPng() {
        if (!diagram) {
            return;
        }
        try {
            downloadBlob(await convertSvgToPngBlob(diagram.svg), `${DOWNLOAD_FILE_STEM}.png`);
        } catch (error) {
            setDisplayedError(toDisplayedError(error));
        }
    }

    const graphmlDataUrl = diagram ? `data:application/xml;charset=utf-8,${encodeURIComponent(diagram.graphml)}` : "";

    return (
        <div>
            <Title className={classes.title}>
                {`OpenRVDAS Diagram`}
            </Title>
            <div style={{ height: 50 }}></div>
            <Container className={classes.content} size="xl">
                <Stack w="100%" maw={640}>
                    <FileInput
                        label="Logger config files"
                        description="The OpenRVDAS config YAMLs to diagram"
                        placeholder="Choose .yml or .yaml files"
                        accept={YAML_FILE_TYPES}
                        multiple
                        clearable
                        withAsterisk
                        value={configFiles}
                        onChange={(files) => { setConfigFiles(files); clearPreviousOutcome(); }}
                    />
                    <FileInput
                        label="Logger template files"
                        description="Any template YAMLs the configs include"
                        placeholder="Choose .yml or .yaml files"
                        accept={YAML_FILE_TYPES}
                        multiple
                        clearable
                        value={templateFiles}
                        onChange={(files) => { setTemplateFiles(files); clearPreviousOutcome(); }}
                    />
                    <Button onClick={generateDiagram} loading={isGenerating} disabled={configFiles.length === 0}>
                        Generate diagram
                    </Button>
                    {displayedError && (
                        <Alert color="red" title="Diagram could not be generated">
                            <pre>{displayedError.message}</pre>
                            {displayedError.referenceId && (
                                <Text size="xs" mt="xs">Reference ID: {displayedError.referenceId}</Text>
                            )}
                        </Alert>
                    )}
                </Stack>
                {diagram && (
                    <Stack w="100%">
                        <Group justify="flex-end">
                            <Anchor href={diagram.svgUrl} download={`${DOWNLOAD_FILE_STEM}.svg`}>Download SVG</Anchor>
                            <Anchor component="button" type="button" onClick={downloadPng}>Download PNG</Anchor>
                            <Anchor href={graphmlDataUrl} download={`${DOWNLOAD_FILE_STEM}.graphml`}>Download GraphML</Anchor>
                        </Group>
                        <Paper withBorder p="md" style={{ overflow: "auto" }}>
                            <img src={diagram.svgUrl} alt="Generated OpenRVDAS data-flow diagram" style={{ maxWidth: "100%" }} />
                        </Paper>
                    </Stack>
                )}
            </Container>
        </div>
    )
}
