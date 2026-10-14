'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Container, FileInput, Stack, Text, Title } from "@mantine/core";
import classes from "@/components/Page.module.css";
import { requestDiagram } from "@/diagramApi/client";
import { DiagramApiError, type YamlFile } from "@/diagramApi/types";
import { describeUpload, useDiagramSession } from "@/diagramSession/DiagramSessionProvider";

const YAML_FILE_TYPES = ".yml,.yaml";
const INTERNAL_ERROR_CODE = "internal_error";

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

export default function Home() {
    const router = useRouter();
    const { configFiles, templateFiles, setConfigFiles, setTemplateFiles, showDiagram } = useDiagramSession();
    const [isGenerating, setIsGenerating] = useState(false);
    const [displayedError, setDisplayedError] = useState<DisplayedError | null>(null);

    async function generateDiagram() {
        setDisplayedError(null);
        setIsGenerating(true);
        try {
            const result = await requestDiagram({
                configFiles: await readYamlFiles(configFiles),
                templateFiles: await readYamlFiles(templateFiles),
            });
            await showDiagram({
                dot: result.dot,
                graphml: result.graphml,
                summary: describeUpload(configFiles.length, templateFiles.length),
            });
            router.push("/diagram");
        } catch (error) {
            setDisplayedError(toDisplayedError(error));
        } finally {
            setIsGenerating(false);
        }
    }

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
                        onChange={(files) => { setConfigFiles(files); setDisplayedError(null); }}
                    />
                    <FileInput
                        label="Logger template files"
                        description="Any template YAMLs the configs include"
                        placeholder="Choose .yml or .yaml files"
                        accept={YAML_FILE_TYPES}
                        multiple
                        clearable
                        value={templateFiles}
                        onChange={(files) => { setTemplateFiles(files); setDisplayedError(null); }}
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
            </Container>
        </div>
    )
}
