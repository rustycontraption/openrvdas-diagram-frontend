import { Alert, Button, Group, Text } from "@mantine/core";

interface FilesUnavailableNoticeProps {
    onAddFiles: () => void;
}

export function FilesUnavailableNotice({ onAddFiles }: FilesUnavailableNoticeProps) {
    return (
        <Alert color="grey" radius={0} py={6}>
            <Group gap="sm" wrap="nowrap">
                <Text size="sm">Source YAML files no longer available. Add the files again to modify the graph.</Text>
                <Button variant="light" size="compact-xs" onClick={onAddFiles}>Add files</Button>
            </Group>
        </Alert>
    );
}
