import { Checkbox, Combobox, Group, Input, Pill, PillsInput, ScrollArea, Text, Title, useCombobox } from "@mantine/core";
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
}

function FilterCombobox({ optionNodes, selectedNodeNames, onToggleNode, onDeselectNode }: FilterComboboxProps) {
    const combobox = useCombobox({
        onDropdownClose: () => combobox.resetSelectedOption(),
        onDropdownOpen: () => combobox.updateSelectedOptionIndex('active'),
    });

    const nodeOptions = optionNodes.map((node) => (
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
        <Combobox store={combobox} onOptionSubmit={onToggleNode} withinPortal={false}>
            <Combobox.DropdownTarget>
                <PillsInput pointer onClick={() => combobox.toggleDropdown()}>
                    <Pill.Group>
                        <Input.Placeholder>Pick one or more values</Input.Placeholder>
                        <Combobox.EventsTarget>
                            <PillsInput.Field
                                type="hidden"
                                onBlur={() => combobox.closeDropdown()}
                                onKeyDown={(event) => {
                                    if (event.key === 'Backspace' && selectedNodeNames.length > 0) {
                                        event.preventDefault();
                                        onDeselectNode(selectedNodeNames[selectedNodeNames.length - 1]);
                                    }
                                }}
                            />
                        </Combobox.EventsTarget>
                    </Pill.Group>
                </PillsInput>
            </Combobox.DropdownTarget>
            <Combobox.Dropdown>
                <Combobox.Options>
                    <ScrollArea.Autosize mah={FILTER_DROPDOWN_MAXIMUM_HEIGHT} type="auto">
                        {nodeOptions}
                    </ScrollArea.Autosize>
                </Combobox.Options>
            </Combobox.Dropdown>
        </Combobox>
    );
}

// One filter box per node type; all of them share the same selection as the diagram
export function NodeFilters({ nodes, ...nodeSelection }: NodeFiltersProps) {
    function nodesOfType(nodeType: NodeType): DiagramNode[] {
        return nodes.filter((node) => node.nodeType === nodeType);
    }

    return (
        <>
            <Title order={5}>Filter</Title>
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
