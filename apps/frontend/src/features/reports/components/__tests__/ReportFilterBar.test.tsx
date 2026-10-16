import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ReportFilterBar } from '../ReportFilterBar';

describe('ReportFilterBar', () => {
  it('renders all filter inputs', () => {
    render(<ReportFilterBar filters={{}} onFilterChange={vi.fn()} />);

    expect(screen.getByTestId('filter-start-date')).toBeInTheDocument();
    expect(screen.getByTestId('filter-end-date')).toBeInTheDocument();
    expect(screen.getByTestId('filter-supplier-id')).toBeInTheDocument();
    expect(screen.getByTestId('filter-shipment-id')).toBeInTheDocument();
    expect(screen.getByTestId('filter-item-id')).toBeInTheDocument();
    expect(screen.getByTestId('filter-category')).toBeInTheDocument();
    expect(screen.getByTestId('filter-status')).toBeInTheDocument();
    expect(screen.getByTestId('filter-group-by')).toBeInTheDocument();
  });

  it('calls onFilterChange when an input value changes', () => {
    const handleFilterChange = vi.fn();
    render(
      <ReportFilterBar filters={{}} onFilterChange={handleFilterChange} />,
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
      supplierId: 'supp-123',
      status: 'pending',
    };
    render(<ReportFilterBar filters={filters} onFilterChange={vi.fn()} />);

    expect(screen.getByTestId('filter-start-date')).toHaveValue('2023-05-01');
    expect(screen.getByTestId('filter-supplier-id')).toHaveValue('supp-123');
    expect(screen.getByTestId('filter-status')).toHaveValue('pending');
    expect(screen.getByTestId('filter-end-date')).toHaveValue('');
  });
});
