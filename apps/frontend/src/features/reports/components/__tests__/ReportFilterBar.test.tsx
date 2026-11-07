import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ReportFilterBar } from '../ReportFilterBar';

vi.mock('@/features/suppliers/api', () => ({
  useSuppliers: () => ({
    data: { data: [{ id: 'supplier-1', name: 'Demo Supplier' }] },
    isLoading: false,
  }),
}));
vi.mock('@/features/import-shipments/api', () => ({
  useShipments: () => ({
    data: { data: [{ id: 'shipment-1', shipmentNumber: 'SHP-001' }] },
    isLoading: false,
  }),
}));
vi.mock('@/features/items/api', () => ({
  useItems: () => ({
    data: { data: [{ id: 'item-1', itemCode: 'ITEM-001', name: 'Phone' }] },
    isLoading: false,
  }),
}));
vi.mock('@/features/cost-categories/api', () => ({
  useCostCategories: () => ({
    data: [
      {
        id: 'category-1',
        code: 'FREIGHT',
        name: 'Freight',
        isActive: true,
      },
    ],
    isLoading: false,
  }),
}));

describe('ReportFilterBar', () => {
  it('renders all filter inputs', () => {
    render(
      <ReportFilterBar
        filters={{}}
        onFilterChange={vi.fn()}
        onClear={vi.fn()}
        reportKey="landed-cost-by-item"
      />,
    );

    expect(screen.getByTestId('filter-start-date')).toBeInTheDocument();
    expect(screen.getByTestId('filter-end-date')).toBeInTheDocument();
    expect(screen.getByTestId('filter-supplier-id')).toBeInTheDocument();
    expect(screen.getByTestId('filter-shipment-id')).toBeInTheDocument();
    expect(screen.getByTestId('filter-item-id')).toBeInTheDocument();
    expect(screen.getByTestId('filter-status')).toBeInTheDocument();
    expect(screen.getByTestId('filter-item-id')).toBeRequired();
  });

  it('calls onFilterChange when an input value changes', () => {
    const handleFilterChange = vi.fn();
    render(
      <ReportFilterBar
        filters={{}}
        onFilterChange={handleFilterChange}
        onClear={vi.fn()}
        reportKey="import-cost-summary"
      />,
    );

    const startDateInput = screen.getByTestId('filter-start-date');
    fireEvent.change(startDateInput, { target: { value: '2023-01-01' } });

    expect(handleFilterChange).toHaveBeenCalledWith('startDate', '2023-01-01');

    const statusSelect = screen.getByTestId('filter-status');
    fireEvent.change(statusSelect, { target: { value: 'cleared' } });

    expect(handleFilterChange).toHaveBeenCalledWith('status', 'cleared');
  });

  it('displays existing filter values correctly', () => {
    const filters = {
      startDate: '2023-05-01',
      supplierId: 'supplier-1',
      status: 'shipped',
    };
    render(
      <ReportFilterBar
        filters={filters}
        onFilterChange={vi.fn()}
        onClear={vi.fn()}
        reportKey="import-cost-summary"
      />,
    );

    expect(screen.getByTestId('filter-start-date')).toHaveValue('2023-05-01');
    expect(screen.getByTestId('filter-supplier-id')).toHaveValue('supplier-1');
    expect(screen.getByTestId('filter-status')).toHaveValue('shipped');
    expect(screen.getByTestId('filter-end-date')).toHaveValue('');
  });

  it('offers existing system records rather than requiring users to type IDs', () => {
    render(
      <ReportFilterBar
        filters={{}}
        onFilterChange={vi.fn()}
        onClear={vi.fn()}
        reportKey="landed-cost-by-shipment"
      />,
    );

    expect(screen.getByTestId('filter-supplier-id')).toHaveDisplayValue(
      'All suppliers',
    );
    expect(screen.getByRole('option', { name: 'Demo Supplier' })).toHaveValue(
      'supplier-1',
    );
    expect(screen.getByRole('option', { name: 'SHP-001' })).toHaveValue(
      'shipment-1',
    );
    expect(
      screen.getByRole('option', { name: 'ITEM-001 - Phone' }),
    ).toHaveValue('item-1');
    expect(
      screen.getByRole('option', { name: 'FREIGHT - Freight' }),
    ).toHaveValue('category-1');
  });

  it('uses variance statuses rather than shipment statuses for variance reports', () => {
    render(
      <ReportFilterBar
        filters={{}}
        onFilterChange={vi.fn()}
        onClear={vi.fn()}
        reportKey="cost-variance"
      />,
    );

    expect(screen.getByText('Variance Status')).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'pending approval' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'partially received' }),
    ).not.toBeInTheDocument();
  });
});
