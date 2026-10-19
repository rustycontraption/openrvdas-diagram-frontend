import { ActionIcon, Button, Group, Menu, Text, Tooltip } from "@mantine/core";
import { FaArrowLeft, FaDownload, FaExpand, FaMinus, FaPlus, FaSlidersH } from "react-icons/fa";
import classes from "./DiagramWorkspace.module.css";

interface WorkspaceToolbarProps {
    summary: string;
    isSettingsOpen: boolean;
    onEditFiles: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFitToScreen: () => void;
    onExportSvg: () => void;
    onExportPng: () => void;
    onExportGraphml: () => void;
    onExportYed: () => void;
    canExportYed: boolean;
    onToggleSettings: () => void;
}

export function WorkspaceToolbar(props: WorkspaceToolbarProps) {
    return (
        <Group className={classes.toolbar} justify="space-between" wrap="nowrap" gap="sm">
            <Group gap="sm" wrap="nowrap" miw={0}>
                <Button variant="subtle" leftSection={<FaArrowLeft />} onClick={props.onEditFiles}>
                    Edit files
                </Button>
                <Text size="sm" className={classes.summary}>{props.summary}</Text>
            </Group>

            <Group gap="xs" wrap="nowrap">
                <ActionIcon.Group>
                    <Tooltip label="Zoom out">
                        <ActionIcon variant="default" size="lg" onClick={props.onZoomOut} aria-label="Zoom out"><FaMinus /></ActionIcon>
                    </Tooltip>
                    <Tooltip label="Fit to screen">
                        <ActionIcon variant="default" size="lg" onClick={props.onFitToScreen} aria-label="Fit to screen"><FaExpand /></ActionIcon>
                    </Tooltip>
                    <Tooltip label="Zoom in">
                        <ActionIcon variant="default" size="lg" onClick={props.onZoomIn} aria-label="Zoom in"><FaPlus /></ActionIcon>
                    </Tooltip>
                </ActionIcon.Group>

                <Menu position="bottom-end">
                    <Menu.Target>
                        <Button variant="default" leftSection={<FaDownload />}>Export</Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Item onClick={props.onExportSvg}>SVG image</Menu.Item>
                        <Menu.Item onClick={props.onExportPng}>PNG image</Menu.Item>
                        <Menu.Item onClick={props.onExportGraphml}>GraphML</Menu.Item>
                        <Menu.Item onClick={props.onExportYed} disabled={!props.canExportYed}>yEd GraphML</Menu.Item>
                    </Menu.Dropdown>
                </Menu>

                <Tooltip label={props.isSettingsOpen ? "Hide settings" : "Show settings"}>
                    <ActionIcon
                        variant={props.isSettingsOpen ? "filled" : "default"}
                        size="lg"
                        onClick={props.onToggleSettings}
                        aria-label="Toggle settings"
                        aria-pressed={props.isSettingsOpen}
                    >
                        <FaSlidersH />
                    </ActionIcon>
                </Tooltip>
            </Group>
        </Group>
    );
}
