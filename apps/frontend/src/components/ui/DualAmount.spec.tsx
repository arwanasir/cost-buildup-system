import { render, screen } from '@testing-library/react';
import { DualAmount } from './DualAmount';

describe('DualAmount', () => {
  it('renders money formatted amounts by default', () => {
    render(
      <DualAmount foreignAmount={100} foreignCurrency="USD" etbAmount={5000} />,
    );

    // Default 'money' format uses 4 decimal places
    expect(screen.getByText('USD 100.0000')).toBeInTheDocument();
    expect(screen.getByText('ETB 5,000.0000')).toBeInTheDocument();
  });

  it('renders unitCost formatted amounts when type="unitCost"', () => {
    render(
      <DualAmount
        foreignAmount="1.5"
        foreignCurrency="EUR"
        etbAmount="80.12345"
        type="unitCost"
      />,
    );

    // 'unitCost' format uses 6 decimal places
    expect(screen.getByText('EUR 1.500000')).toBeInTheDocument();
    expect(screen.getByText('ETB 80.123450')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <DualAmount
        foreignAmount={100}
        foreignCurrency="USD"
        etbAmount={5000}
        className="custom-class"
      />,
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
