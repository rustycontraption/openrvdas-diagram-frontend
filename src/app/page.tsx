'use client'

import { useState } from "react";
import { Alert, Anchor, Button, Container, FileInput, Group, Paper, Stack, Text, Title } from "@mantine/core";
import classes from "@/components/Page.module.css";
import type { ApiErrorResponse, DiagramResult, YamlFile } from "@/server/diagramGenerator/types";

const YAML_FILE_TYPES = ".yml,.yaml";
const INTERNAL_ERROR_CODE = "internal_error";

interface DisplayedError {
    message: string;
    referenceId?: string;
}

function toDisplayedError(response: ApiErrorResponse): DisplayedError {
    const { code, message, requestId } = response.error;
    // Only unexpected errors need a reference to match the user's report to the server log
    return { message, referenceId: code === INTERNAL_ERROR_CODE ? requestId : undefined };
}

async function readYamlFiles(files: File[]): Promise<YamlFile[]> {
    return Promise.all(files.map(async (file) => ({ name: file.name, content: await file.text() })));
}

export default function Home() {
    const [configFiles, setConfigFiles] = useState<File[]>([]);
    const [templateFiles, setTemplateFiles] = useState<File[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [displayedError, setDisplayedError] = useState<DisplayedError | null>(null);
    const [diagram, setDiagram] = useState<DiagramResult | null>(null);

    function clearPreviousOutcome() {
        setDisplayedError(null);
        setDiagram(null);
    }

    async function generateDiagram() {
        clearPreviousOutcome();
        setIsGenerating(true);
        try {
            const response = await fetch("/api/diagram", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    configFiles: await readYamlFiles(configFiles),
                    templateFiles: await readYamlFiles(templateFiles),
                }),
            });
            const responseBody = await response.json();
            if (!response.ok) {
                setDisplayedError(toDisplayedError(responseBody));
                return;
            }
            setDiagram(responseBody);
        } catch {
            setDisplayedError({ message: "Could not reach the server. Please try again." });
        } finally {
            setIsGenerating(false);
        }
    }

    const pngDataUrl = diagram ? `data:image/png;base64,${diagram.pngBase64}` : "";
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
                            <Anchor href={pngDataUrl} download="data-flow-generated.png">Download PNG</Anchor>
                            <Anchor href={graphmlDataUrl} download="data-flow-generated.graphml">Download GraphML</Anchor>
                        </Group>
                        <Paper withBorder p="md" style={{ overflow: "auto" }}>
                            <img src={pngDataUrl} alt="Generated OpenRVDAS data-flow diagram" style={{ maxWidth: "100%" }} />
                        </Paper>
                    </Stack>
                )}
            </Container>
        </div>
    )
}
