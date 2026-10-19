import { Alert, Button, Group, Text } from "@mantine/core";

interface FilesUnavailableNoticeProps {
    onAddFiles: () => void;
}

/**
 * Explains, in one place, why changing the color scheme and exporting for yEd are unavailable:
 * both re-send the uploaded files, which only live in the page's memory and are gone after a reload.
 */
export function FilesUnavailableNotice({ onAddFiles }: FilesUnavailableNoticeProps) {
    return (
        <Alert color="yellow" radius={0} py={6}>
            <Group gap="sm" justify="space-between" wrap="nowrap">
                <Text size="sm">Source YAML files no longer available. Add the files again to modify the graph.</Text>
                <Button variant="light" size="compact-xs" onClick={onAddFiles}>Add files</Button>
            </Group>
        </Alert>
    );
}
