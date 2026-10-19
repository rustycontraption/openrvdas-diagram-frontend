'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Container, FileInput, Stack, Text, Title } from "@mantine/core";
import classes from "@/components/Page.module.css";
import { toDisplayedError, type DisplayedError } from "@/diagramApi/displayedError";
import { useDiagramSession } from "@/diagramSession/DiagramSessionProvider";

const YAML_FILE_TYPES = ".yml,.yaml";

export default function Home() {
    const router = useRouter();
    const {
        configFiles, templateFiles, setConfigFiles, setTemplateFiles, colorSchemeFamily, generateDiagram,
    } = useDiagramSession();
    const [isGenerating, setIsGenerating] = useState(false);
    const [displayedError, setDisplayedError] = useState<DisplayedError | null>(null);

    async function generateAndOpenDiagram() {
        setDisplayedError(null);
        setIsGenerating(true);
        try {
            await generateDiagram(colorSchemeFamily);
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
                    <Button onClick={generateAndOpenDiagram} loading={isGenerating} disabled={configFiles.length === 0}>
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
