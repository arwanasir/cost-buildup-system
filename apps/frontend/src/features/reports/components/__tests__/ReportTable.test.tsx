import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ReportTable } from '../ReportTable';

describe('ReportTable', () => {
  const columns = ['name', 'amount_etb'];
  const rows = [
    { name: 'Item A', amount_etb: 100 },
    { name: 'Item B', amount_etb: 200 },
  ];

  it('renders a table without totals correctly', () => {
    render(<ReportTable columns={columns} rows={rows} />);

    // Check headers
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('amount etb')).toBeInTheDocument(); // normalized header

    // Check row data
    expect(screen.getByText('Item A')).toBeInTheDocument();
    expect(screen.getByText('Item B')).toBeInTheDocument();

    // Check formatted money
    expect(screen.getByText('100.00')).toBeInTheDocument();
    expect(screen.getByText('200.00')).toBeInTheDocument();

    // Should not render tfoot
    expect(screen.queryByText('TOTAL')).not.toBeInTheDocument();
  });

  it('renders a totals row when totals prop is provided', () => {
    const totals = { amount_etb: 300 };
    render(<ReportTable columns={columns} rows={rows} totals={totals} />);

    // Should render "TOTAL" in the first column
    expect(screen.getByText('TOTAL')).toBeInTheDocument();

    // Should render the formatted total amount
    expect(screen.getByText('300.00')).toBeInTheDocument();

    // Check if tfoot exists
    const tfoot = document.querySelector('tfoot');
    expect(tfoot).toBeInTheDocument();
  });

  it('handles empty totals object gracefully', () => {
    render(<ReportTable columns={columns} rows={rows} totals={{}} />);
    expect(screen.queryByText('TOTAL')).not.toBeInTheDocument();
  });
});
