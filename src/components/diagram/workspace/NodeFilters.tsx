import { useState } from "react";
import { Button, Checkbox, Combobox, Group, Input, Pill, PillsInput, ScrollArea, Text, Title, useCombobox } from "@mantine/core";
import type { DiagramNode, NodeType } from "@/components/diagram/model/graph";

// Long node lists scroll inside the dropdown instead of running off the screen
const FILTER_DROPDOWN_MAXIMUM_HEIGHT = 200;

interface NodeSelectionProps {
    selectedNodeNames: string[];
    onToggleNode: (dotName: string) => void;
    onDeselectNode: (dotName: string) => void;
}

interface FilterComboboxProps extends NodeSelectionProps {
    optionNodes: DiagramNode[];
}

interface NodeFiltersProps extends NodeSelectionProps {
    nodes: DiagramNode[];
    onClearFilters: () => void;
}

function FilterCombobox({ optionNodes, selectedNodeNames, onToggleNode, onDeselectNode }: FilterComboboxProps) {
    const [search, setSearch] = useState("");
    const combobox = useCombobox({
        onDropdownOpen: () => {
            combobox.updateSelectedOptionIndex("active");
            combobox.focusSearchInput();
        },
        onDropdownClose: () => {
            combobox.resetSelectedOption();
            setSearch("");
        },
    });

    // Only this box's nodes, so removing one never touches another node type's filters
    const selectedNodes = optionNodes.filter((node) => selectedNodeNames.includes(node.dotName));
    const normalizedSearch = search.trim().toLowerCase();
    const matchingNodes = optionNodes.filter((node) => node.label.toLowerCase().includes(normalizedSearch));

    const selectedNodePills = selectedNodes.map((node) => (
        <Pill key={node.dotName} withRemoveButton onRemove={() => onDeselectNode(node.dotName)}>
            {node.label}
        </Pill>
    ));

    const nodeOptions = matchingNodes.map((node) => (
        <Combobox.Option value={node.dotName} key={node.dotName} active={selectedNodeNames.includes(node.dotName)}>
            <Group gap="sm">
                <Checkbox
                    checked={selectedNodeNames.includes(node.dotName)}
                    onChange={() => { }}
                    aria-hidden
                    tabIndex={-1}
                    style={{ pointerEvents: 'none' }}
                />
                <span>{node.label}</span>
            </Group>
        </Combobox.Option>
    ));

    return (
        <Combobox store={combobox} onOptionSubmit={onToggleNode} withinPortal={false} width="max-content">
            <Combobox.DropdownTarget>
                <PillsInput pointer onClick={() => combobox.toggleDropdown()}>
                    <Pill.Group>
                        {selectedNodePills.length > 0
                            ? selectedNodePills
                            : <Input.Placeholder>Pick one or more values</Input.Placeholder>}
                    </Pill.Group>
                </PillsInput>
            </Combobox.DropdownTarget>
            <Combobox.Dropdown>
                <Combobox.Search
                    value={search}
                    onChange={(event) => setSearch(event.currentTarget.value)}
                    placeholder="Search"
                    onKeyDown={(event) => {
                        if (event.key === "Backspace" && search === "" && selectedNodes.length > 0) {
                            event.preventDefault();
                            onDeselectNode(selectedNodes[selectedNodes.length - 1].dotName);
                        }
                    }}
                />
                <Combobox.Options>
                    <ScrollArea.Autosize mah={FILTER_DROPDOWN_MAXIMUM_HEIGHT} type="auto">
                        {nodeOptions.length > 0 ? nodeOptions : <Combobox.Empty>Nothing found</Combobox.Empty>}
                    </ScrollArea.Autosize>
                </Combobox.Options>
            </Combobox.Dropdown>
        </Combobox>
    );
}

// One filter box per node type; all of them share the same selection as the diagram
export function NodeFilters({ nodes, onClearFilters, ...nodeSelection }: NodeFiltersProps) {
    function nodesOfType(nodeType: NodeType): DiagramNode[] {
        return nodes.filter((node) => node.nodeType === nodeType);
    }

    return (
        <>
            <Group justify="space-between">
                <Title order={5}>Filter</Title>
                <Button
                    variant="subtle"
                    size="compact-xs"
                    onClick={onClearFilters}
                    disabled={nodeSelection.selectedNodeNames.length === 0}
                >
                    Clear all
                </Button>
            </Group>
            <Group gap="xs">
                <Text size="sm">Sources:</Text>
                <FilterCombobox optionNodes={nodesOfType("source")} {...nodeSelection} />
            </Group>
            <Group gap="xs">
                <Text size="sm">Loggers:</Text>
                <FilterCombobox optionNodes={nodesOfType("logger")} {...nodeSelection} />
            </Group>
            <Group gap="xs">
                <Text size="sm">Destinations:</Text>
                <FilterCombobox optionNodes={nodesOfType("destination")} {...nodeSelection} />
            </Group>
        </>
    );
}
