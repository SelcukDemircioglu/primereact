import React, { Component } from 'react';
import { BodyRow } from './BodyRow';
import DomHandler from '../utils/DomHandler';
import ObjectUtils from '../utils/ObjectUtils';
import { RowTogglerButton } from './RowTogglerButton';

export class TableBody extends Component {

    constructor(props) {
        super(props);
        this.onRowClick = this.onRowClick.bind(this);
        this.onRowRightClick = this.onRowRightClick.bind(this);
        this.onRowTouchEnd = this.onRowTouchEnd.bind(this);
        this.onRowToggle = this.onRowToggle.bind(this);
        this.onRowEditingToggle = this.onRowEditingToggle.bind(this);
        this.onRadioClick = this.onRadioClick.bind(this);
        this.onCheckboxClick = this.onCheckboxClick.bind(this);
        this.onRowDragEnd = this.onRowDragEnd.bind(this);
        this.onRowDragLeave = this.onRowDragLeave.bind(this);
        this.onRowDrop = this.onRowDrop.bind(this);
    }

    onRowClick(event) {
        let targetNode = event.originalEvent.target.nodeName;
        if (targetNode === 'INPUT' || targetNode === 'BUTTON' || targetNode === 'A' || (DomHandler.hasClass(event.originalEvent.target, 'p-clickable'))) {
            return;
        }

        if (this.props.onRowClick) {
            this.props.onRowClick(event);
        }

        const allowRadioRowSelection = this.isRadioSelectionMode() && !this.isRadioRowSelectionMode();
        const allowCheckboxRowSelection = this.isCheckboxSelectionMode() && !this.isCheckboxRowSelectionMode();

        if (this.props.selectionMode || allowRadioRowSelection || allowCheckboxRowSelection) {
            if (this.isMultipleSelectionMode() && event.originalEvent.shiftKey && this.anchorRowIndex !== null) {
                this.onRangeSelection(event);
            }
            else {
                let metaKey = this.props.metaKeySelection && (event.originalEvent.metaKey || event.originalEvent.ctrlKey);
                this.anchorRowIndex = event.index;
                this.rangeRowIndex = event.index;
                this.anchorRowFirst = this.props.first;

                if (this.isSingleSelectionMode() || this.isRadioSelectionMode()) {
                    this.onSingleSelection({ ...event, toggleable: metaKey, type: 'row' });
                }
                else {
                    this.onMultipleSelection({ ...event, toggleable: metaKey, type: 'row' });
                }
            }
        }

        this.rowTouched = false;
    }

    onRangeSelection(event) {
        const { originalEvent, index } = event;

        DomHandler.clearSelection();
        this.rangeRowIndex = index;
        let selectionInRange = this.selectRange(event);
        let selection = this.isAddRowSelectionMode() ? [...new Set([...(this.props.selection || []), ...selectionInRange])] : selectionInRange;

        if (this.props.onSelectionChange && selection !== this.props.selection) {
            this.props.onSelectionChange({
                originalEvent,
                value: selection
            });
        }
    }

    onSingleSelection({ originalEvent, data, toggleable, type }) {
        let selected = this.isSelected(data);
        let selection = this.props.selection;

        if (selected) {
            if (toggleable) {
                selection = null;
                this.props.onRowUnselect && this.props.onRowUnselect({ originalEvent, data, type });
            }
        }
        else {
            selection = data;
            this.props.onRowSelect && this.props.onRowSelect({ originalEvent, data, type });
        }

        if (this.isRadioSelectionMode()) {
            const target = originalEvent.currentTarget;
            const radio = DomHandler.findSingle(target, 'td.p-selection-column input[type="radio"]');
            if (radio) {
                radio.focus();
            }
        }

        if (this.props.onSelectionChange && selection !== this.props.selection) {
            this.props.onSelectionChange({
                originalEvent,
                value: selection
            });
        }
    }

    onMultipleSelection({ originalEvent, data, toggleable, type }) {
        let selected = this.isSelected(data);
        let selection = this.props.selection;

        if (selected) {
            if (toggleable) {
                let selectionIndex = this.findIndexInSelection(data);
                selection = this.props.selection.filter((val, i) => i !== selectionIndex);
                this.props.onRowUnSelect && this.props.onRowUnSelect({ originalEvent, data, type });
            }
            else if (this.isNewRowSelectionMode()) {
                (this.props.selection || []).forEach(d => this.props.onRowUnSelect && this.props.onRowUnSelect({ originalEvent, data: d, type }));
                selection = [data];
                this.props.onRowSelect && this.props.onRowSelect({ originalEvent, data, type });
            }
        }
        else {
            selection = toggleable || this.isAddRowSelectionMode() ? [...selection || [], data] : [data];
            this.props.onRowSelect && this.props.onRowSelect({ originalEvent, data, type });
        }

        if (this.isCheckboxSelectionMode()) {
            const target = originalEvent.currentTarget;
            const checkbox = DomHandler.findSingle(target, 'td.p-selection-column .p-checkbox-box');
            if (checkbox) {
                checkbox.focus();
            }
        }

        if (this.props.onSelectionChange && selection !== this.props.selection) {
            this.props.onSelectionChange({
                originalEvent,
                value: selection
            });
        }
    }

    selectRange(event) {
        let rangeStart, rangeEnd;
        let isLazyAndPaginator = this.props.lazy && this.props.paginator;

        if (isLazyAndPaginator) {
            this.anchorRowIndex += this.anchorRowFirst;
            this.rangeRowIndex += this.props.first;
        }

        if (this.rangeRowIndex > this.anchorRowIndex) {
            rangeStart = this.anchorRowIndex;
            rangeEnd = this.rangeRowIndex;
        }
        else if (this.rangeRowIndex < this.anchorRowIndex) {
            rangeStart = this.rangeRowIndex;
            rangeEnd = this.anchorRowIndex;
        }
        else {
            rangeStart = this.rangeRowIndex;
            rangeEnd = this.rangeRowIndex;
        }

        if (isLazyAndPaginator) {
            rangeStart = Math.max(rangeStart - this.props.first, 0);
            rangeEnd -= this.props.first;
        }

        const value = this.props.value;
        let selection = [];
        for (let i = rangeStart; i <= rangeEnd; i++) {
            let rangeRowData = value[i];
            selection.push(rangeRowData);

            this.props.onRowSelect && this.props.onRowSelect({ originalEvent: event.originalEvent, data: rangeRowData, type: 'row' });
        }

        return selection;
    }

    onRowTouchEnd(event) {
        this.rowTouched = true;
    }

    onRowRightClick(event) {
        if (this.props.onContextMenu) {
            DomHandler.clearSelection();

            if (this.props.onContextMenuSelectionChange) {
                this.props.onContextMenuSelectionChange({
                    originalEvent: event.originalEvent,
                    value: event.data
                });
            }

            if (this.props.onContextMenu) {
                this.props.onContextMenu({
                    originalEvent: event.originalEvent,
                    value: this.props.node
                });
            }

            event.originalEvent.preventDefault();
        }
    }

    onRadioClick(event) {
        this.onSingleSelection({ ...event, toggleable: true, type: 'radio' });
    }

    onCheckboxClick(event) {
        this.onMultipleSelection({ ...event, toggleable: true, type: 'checkbox' });
    }

    isSingleSelectionMode() {
        return this.props.selectionMode === 'single';
    }

    isMultipleSelectionMode() {
        return this.props.selectionMode === 'multiple';
    }

    isRadioSelectionMode() {
        return this.props.selectionModeInColumn === 'single';
    }

    isCheckboxSelectionMode() {
        return this.props.selectionModeInColumn === 'multiple';
    }

    isNewRowSelectionMode() {
        return this.props.rowSelectionMode === 'new';
    }

    isAddRowSelectionMode() {
        return this.props.rowSelectionMode === 'add';
    }

    isRadioRowSelectionMode() {
        return this.props.rowSelectionMode === 'radio';
    }

    isCheckboxRowSelectionMode() {
        return this.props.rowSelectionMode === 'checkbox';
    }

    isSelected(rowData) {
        if (rowData && this.props.selection) {
            if (this.props.selection instanceof Array)
                return this.findIndexInSelection(rowData) > -1;
            else
                return this.equals(rowData, this.props.selection);
        }

        return false;
    }

    isContextMenuSelected(rowData) {
        if (rowData && this.props.contextMenuSelection) {
            return this.equals(rowData, this.props.contextMenuSelection);
        }

        return false;
    }

    equals(data1, data2) {
        return this.compareSelectionBy === 'equals' ? (data1 === data2) : ObjectUtils.equals(data1, data2, this.props.dataKey);
    }

    findIndexInSelection(rowData) {
        let index = -1;
        if (this.props.selection) {
            for (let i = 0; i < this.props.selection.length; i++) {
                if (this.equals(rowData, this.props.selection[i])) {
                    index = i;
                    break;
                }
            }
        }

        return index;
    }

    onRowToggle(event) {
        let expandedRows;
        let dataKey = this.props.dataKey;

        if (dataKey) {
            let dataKeyValue = String(ObjectUtils.resolveFieldData(event.data, dataKey));
            expandedRows = this.props.expandedRows ? { ...this.props.expandedRows } : {};

            if (expandedRows[dataKeyValue] != null) {
                delete expandedRows[dataKeyValue];
                if (this.props.onRowCollapse) {
                    this.props.onRowCollapse({ originalEvent: event, data: event.data });
                }
            }
            else {
                expandedRows[dataKeyValue] = true;
                if (this.props.onRowExpand) {
                    this.props.onRowExpand({ originalEvent: event, data: event.data });
                }
            }
        }
        else {
            let expandedRowIndex = this.findRowIndex(this.props.expandedRows, event.data);
            expandedRows = this.props.expandedRows ? [...this.props.expandedRows] : [];

            if (expandedRowIndex !== -1) {
                expandedRows = expandedRows.filter((val, i) => i !== expandedRowIndex);
                if (this.props.onRowCollapse) {
                    this.props.onRowCollapse({ originalEvent: event, data: event.data });
                }
            }
            else {
                expandedRows.push(event.data);
                if (this.props.onRowExpand) {
                    this.props.onRowExpand({ originalEvent: event, data: event.data });
                }
            }
        }

        if (this.props.onRowToggle) {
            this.props.onRowToggle({
                data: expandedRows
            });
        }
    }

    findRowIndex(rows, row) {
        let index = -1;
        if (rows) {
            rows.some((r, i) => (ObjectUtils.equals(rows[i], row) ? (index = i, true) : false));
        }

        return index;
    }

    isRowExpanded(row) {
        let dataKey = this.props.dataKey;

        if (dataKey) {
            let dataKeyValue = String(ObjectUtils.resolveFieldData(row, dataKey));

            return this.props.expandedRows && this.props.expandedRows[dataKeyValue] != null;
        }
        else {
            return this.findRowIndex(this.props.expandedRows, row) !== -1
        }
    }

    onRowEditingToggle(event) {
        let editingRows;
        let dataKey = this.props.dataKey;

        if (dataKey) {
            let dataKeyValue = String(ObjectUtils.resolveFieldData(event.data, dataKey));
            editingRows = this.props.editingRows ? { ...this.props.editingRows } : {};

            if (editingRows[dataKeyValue] != null)
                delete editingRows[dataKeyValue];
            else
                editingRows[dataKeyValue] = true;
        }
        else {
            let editingRowIndex = this.findRowIndex(this.props.editingRows, event.data);
            editingRows = this.props.editingRows ? [...this.props.editingRows] : [];

            if (editingRowIndex !== -1)
                editingRows = editingRows.filter((val, i) => i !== editingRowIndex);
            else
                editingRows.push(event.data);
        }

        if (this.props.onRowEditChange) {
            this.props.onRowEditChange({
                originalEvent: event.originalEvent,
                data: editingRows,
                index: event.rowIndex
            });
        }
    }

    isRowEditing(row) {
        let dataKey = this.props.dataKey;

        if (dataKey) {
            let dataKeyValue = String(ObjectUtils.resolveFieldData(row, dataKey));

            return this.props.editingRows && this.props.editingRows[dataKeyValue] != null;
        }
        else {
            return this.findRowIndex(this.props.editingRows, row) !== -1
        }
    }

    isSelectionEnabled() {
        if (this.props.selectionMode || this.props.selectionModeInColumn != null) {
            return true;
        }
        else {
            if (Array.isArray(this.props.children)) {
                for (let i = 0; i < this.props.children.length; i++) {
                    if (this.props.children[i].props.selectionMode) {
                        return true;
                    }
                }
            }
            else {
                return this.props.children && this.props.children.selectionMode != null;
            }
        }

        return false;
    }

    onRowDragStart(event, index) {
        this.rowDragging = true;
        this.draggedRowIndex = index;
        event.dataTransfer.setData('text', 'b');    // For firefox
    }

    onRowDragEnd(event, index) {
        this.rowDragging = false;
        this.draggedRowIndex = null;
        this.droppedRowIndex = null;
    }

    onRowDragOver(event, index) {
        if (this.rowDragging && this.draggedRowIndex !== index) {
            let rowElement = event.rowElement;
            let rowY = DomHandler.getOffset(rowElement).top + DomHandler.getWindowScrollTop();
            let pageY = event.originalEvent.pageY;
            let rowMidY = rowY + DomHandler.getOuterHeight(rowElement) / 2;
            let prevRowElement = rowElement.previousElementSibling;

            if (pageY < rowMidY) {
                DomHandler.removeClass(rowElement, 'p-datatable-dragpoint-bottom');

                this.droppedRowIndex = index;
                if (prevRowElement)
                    DomHandler.addClass(prevRowElement, 'p-datatable-dragpoint-bottom');
                else
                    DomHandler.addClass(rowElement, 'p-datatable-dragpoint-top');
            }
            else {
                if (prevRowElement)
                    DomHandler.removeClass(prevRowElement, 'p-datatable-dragpoint-bottom');
                else
                    DomHandler.addClass(rowElement, 'p-datatable-dragpoint-top');

                this.droppedRowIndex = index + 1;
                DomHandler.addClass(rowElement, 'p-datatable-dragpoint-bottom');
            }
        }
    }

    onRowDragLeave(event) {
        let rowElement = event.rowElement;
        let prevRowElement = rowElement.previousElementSibling;
        if (prevRowElement) {
            DomHandler.removeClass(prevRowElement, 'p-datatable-dragpoint-bottom');
        }

        DomHandler.removeClass(rowElement, 'p-datatable-dragpoint-bottom');
        DomHandler.removeClass(rowElement, 'p-datatable-dragpoint-top');
    }

    onRowDrop(event) {
        if (this.droppedRowIndex != null) {
            let dropIndex = (this.draggedRowIndex > this.droppedRowIndex) ? this.droppedRowIndex : (this.droppedRowIndex === 0) ? 0 : this.droppedRowIndex - 1;
            let val = [...this.props.value];
            ObjectUtils.reorderArray(val, this.draggedRowIndex, dropIndex);

            if (this.props.onRowReorder) {
                this.props.onRowReorder({
                    originalEvent: event,
                    value: val,
                    dragIndex: this.draggedRowIndex,
                    dropIndex: this.droppedRowIndex
                })
            }
        }

        //cleanup
        this.onRowDragLeave(event);
        this.onRowDragEnd(event);
    }

    renderRowGroupHeader(rowData, index) {
        let content = null;

        if (this.props.rowGroupMode === 'subheader' && this.props.expandableRowGroups) {
            content = <RowTogglerButton onClick={this.onRowToggle} rowData={rowData} expanded={this.isRowExpanded(rowData)} />
        }

        return (
            <tr role="row" key={index + '_rowgroupheader'} className="p-rowgroup-header">
                <td role="cell" colSpan={React.Children.count(this.props.children)}>
                    {content}
                    <span className="p-rowgroup-header-name">
                        {this.props.rowGroupHeaderTemplate(rowData, index)}
                    </span>
                </td>
            </tr>
        );
    }

    renderRowGroupFooter(rowData, index) {
        return (
            <tr role="row" key={index + '_rowgroupfooter'} className="p-rowgroup-footer">
                {this.props.rowGroupFooterTemplate(rowData, index)}
            </tr>
        );
    }

    render() {
        let rows;

        if (this.props.children) {
            let rpp = this.props.rows || 0;
            let first = this.props.first || 0;
            let selectionEnabled = this.isSelectionEnabled();
            let rowGroupMode = this.props.rowGroupMode;
            let hasSubheaderGrouping = (rowGroupMode && rowGroupMode === 'subheader');
            let rowSpanGrouping = (rowGroupMode && rowGroupMode === 'rowspan');
            let rowGroupHeaderExpanded = false;

            if (this.props.value && this.props.value.length) {
                rows = [];
                let startIndex = this.props.lazy ? 0 : (this.props.value.length > first ? first : 0);
                let endIndex = this.props.virtualScroll ? (startIndex + rpp * 2) : (startIndex + rpp || this.props.value.length);

                for (let i = startIndex; i < endIndex; i++) {
                    if (i >= this.props.value.length) {
                        break;
                    }

                    let rowData = this.props.value[i];
                    let expanded = this.isRowExpanded(rowData);
                    let editing = this.isRowEditing(rowData);
                    let selected = selectionEnabled ? this.isSelected(this.props.value[i]) : false;
                    let contextMenuSelected = this.isContextMenuSelected(rowData);
                    let groupRowSpan;

                    //header row group
                    if (hasSubheaderGrouping) {
                        let currentRowFieldData = ObjectUtils.resolveFieldData(rowData, this.props.groupField);
                        let previousRowFieldData = ObjectUtils.resolveFieldData(this.props.value[i - 1], this.props.groupField);

                        if (i === 0 || (currentRowFieldData !== previousRowFieldData)) {
                            rows.push(this.renderRowGroupHeader(rowData, i));
                            rowGroupHeaderExpanded = expanded;
                        }
                    }

                    if (rowSpanGrouping) {
                        let rowSpanIndex = i;
                        let currentRowFieldData = ObjectUtils.resolveFieldData(rowData, this.props.sortField);
                        let shouldCountRowSpan = (i === startIndex) || ObjectUtils.resolveFieldData(this.props.value[i - 1], this.props.sortField) !== currentRowFieldData;

                        if (shouldCountRowSpan) {
                            let nextRowFieldData = currentRowFieldData;
                            groupRowSpan = 0;

                            while (currentRowFieldData === nextRowFieldData) {
                                groupRowSpan++;
                                let nextRowData = this.props.value[++rowSpanIndex];
                                if (nextRowData) {
                                    nextRowFieldData = ObjectUtils.resolveFieldData(nextRowData, this.props.sortField);
                                }
                                else {
                                    break;
                                }
                            }
                        }
                    }

                    let isRowGroupExpanded = this.props.expandableRowGroups && hasSubheaderGrouping && rowGroupHeaderExpanded;
                    if (!this.props.expandableRowGroups || isRowGroupExpanded) {
                        //row content
                        let bodyRow = <BodyRow tableId={this.props.tableId} key={i} value={this.props.value} rowData={rowData} rowIndex={i} onClick={this.onRowClick} onDoubleClick={this.props.onRowDoubleClick} onRightClick={this.onRowRightClick} onTouchEnd={this.onRowTouchEnd}
                            onRowToggle={this.onRowToggle} expanded={expanded} selectionMode={this.props.selectionMode} selectOnEdit={this.props.selectOnEdit}
                            onRadioClick={this.onRadioClick} onCheckboxClick={this.onCheckboxClick} selected={selected} contextMenuSelected={contextMenuSelected} rowClassName={this.props.rowClassName}
                            sortField={this.props.sortField} rowGroupMode={this.props.rowGroupMode} groupRowSpan={groupRowSpan}
                            onDragStart={(e) => this.onRowDragStart(e, i)} onDragEnd={this.onRowDragEnd} onDragOver={(e) => this.onRowDragOver(e, i)} onDragLeave={this.onRowDragLeave}
                            onDrop={this.onRowDrop} virtualScroll={this.props.virtualScroll} virtualRowHeight={this.props.virtualRowHeight}
                            editMode={this.props.editMode} editing={editing} isRowEditingControlled={!!this.props.onRowEditChange} rowEditorValidator={this.props.rowEditorValidator}
                            onRowEditInit={this.props.onRowEditInit} onRowEditSave={this.props.onRowEditSave} onRowEditCancel={this.props.onRowEditCancel} onRowEditingToggle={this.onRowEditingToggle}
                            showRowReorderElement={this.props.showRowReorderElement} showSelectionElement={this.props.showSelectionElement} selectionModeInColumn={this.props.selectionModeInColumn} rowSelectionMode={this.props.rowSelectionMode}>
                            {this.props.children}
                        </BodyRow>

                        rows.push(bodyRow);
                    }

                    //row expansion
                    if (expanded && !(hasSubheaderGrouping && this.props.expandableRowGroups)) {
                        let expandedRowContent = this.props.rowExpansionTemplate(rowData);
                        let id = `${this.props.tableId ? this.props.tableId + '_' : ''}content_${i}_expanded`;
                        let expandedRow = <tr key={id} id={id} role="row"><td role="cell" colSpan={this.props.children.length}>{expandedRowContent}</td></tr>
                        rows.push(expandedRow);
                    }

                    //footer row group
                    if (hasSubheaderGrouping && (!this.props.expandableRowGroups || isRowGroupExpanded)) {
                        let currentRowFieldData = ObjectUtils.resolveFieldData(rowData, this.props.groupField);
                        let nextRowFieldData = ObjectUtils.resolveFieldData(this.props.value[i + 1], this.props.groupField);

                        if ((i === this.props.value.length - 1) || (currentRowFieldData !== nextRowFieldData)) {
                            rows.push(this.renderRowGroupFooter(rowData, i));
                        }
                    }
                }
            }
            else {
                let emptyMessage = this.props.emptyMessage;

                rows = !this.props.loading && emptyMessage !== null ?
                    <tr role="row" className="p-datatable-emptymessage">
                        <td role="cell" colSpan={this.props.children.length}>
                            {
                                (typeof emptyMessage === 'function') ? emptyMessage(this.props.frozen) : emptyMessage
                            }
                        </td>
                    </tr> : null;
            }
        }

        return (
            <tbody className="p-datatable-tbody">
                {rows}
            </tbody>
        );
    }
}
