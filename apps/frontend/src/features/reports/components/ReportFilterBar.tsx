import React from 'react';
import { Card, Input, Select } from '@/components/ui';
import { type ReportFilterDto } from '../api';

export interface ReportFilterBarProps {
  filters: ReportFilterDto;
  onFilterChange: (field: keyof ReportFilterDto, value: string) => void;
}

export function ReportFilterBar({
  filters,
  onFilterChange,
}: ReportFilterBarProps) {
  return (
    <Card
      className="p-4 bg-white border shadow-sm"
      data-testid="report-filter-bar"
    >
      <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">
        Filter Parameters
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <Input
          type="date"
          label="Start Date"
          value={filters.startDate || ''}
          onChange={(e) => onFilterChange('startDate', e.target.value)}
          data-testid="filter-start-date"
        />
        <Input
          type="date"
          label="End Date"
          value={filters.endDate || ''}
          onChange={(e) => onFilterChange('endDate', e.target.value)}
          data-testid="filter-end-date"
        />
        <Input
          label="Supplier ID"
          placeholder="UUID"
          value={filters.supplierId || ''}
          onChange={(e) => onFilterChange('supplierId', e.target.value)}
          data-testid="filter-supplier-id"
        />
        <Input
          label="Shipment ID"
          placeholder="UUID"
          value={filters.shipmentId || ''}
          onChange={(e) => onFilterChange('shipmentId', e.target.value)}
          data-testid="filter-shipment-id"
        />
        <Input
          label="Item ID"
          placeholder="UUID"
          value={filters.itemId || ''}
          onChange={(e) => onFilterChange('itemId', e.target.value)}
          data-testid="filter-item-id"
        />
        <Input
          label="Category"
          placeholder="e.g. freight, duty"
          value={filters.category || ''}
          onChange={(e) => onFilterChange('category', e.target.value)}
          data-testid="filter-category"
        />
        <Select
          label="Status"
          value={filters.status || ''}
          onChange={(e) => onFilterChange('status', e.target.value)}
          data-testid="filter-status"
          options={[
            { label: '-- All --', value: '' },
            { label: 'Pending', value: 'pending' },
            { label: 'Cleared', value: 'cleared' },
            { label: 'Closed', value: 'closed' },
          ]}
        />
        <Select
          label="Period Grouping"
          value={filters.groupBy || ''}
          onChange={(e) => onFilterChange('groupBy', e.target.value)}
          data-testid="filter-group-by"
          options={[
            { label: '-- None --', value: '' },
            { label: 'Daily', value: 'day' },
            { label: 'Weekly', value: 'week' },
            { label: 'Monthly', value: 'month' },
          ]}
        />
      </div>
    </Card>
  );
}
