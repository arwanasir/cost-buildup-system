import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api-client', () => ({ api: { get } }));

import { downloadExport } from './index';

describe('downloadExport', () => {
  beforeEach(() => {
    get.mockReset();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:report'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('requests the selected format and triggers a named file download', async () => {
    get.mockResolvedValue({
      data: new Blob(['xlsx-content']),
      headers: {
        'content-disposition': 'attachment; filename="supplier-report.xlsx"',
      },
    });
    let downloadedName = '';
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloadedName = this.download;
      });

    await downloadExport('landed-cost-by-supplier', 'excel', {
      supplierId: 'supplier-1',
    });

    expect(get).toHaveBeenCalledWith(
      '/reports/landed-cost-by-supplier/export/excel?supplier_id=supplier-1',
      { responseType: 'blob' },
    );
    expect(click).toHaveBeenCalledOnce();
    expect(downloadedName).toBe('supplier-report.xlsx');
  });

  it('fails clearly instead of downloading an empty response', async () => {
    get.mockResolvedValue({ data: new Blob([]), headers: {} });

    await expect(
      downloadExport('landed-cost-by-supplier', 'pdf'),
    ).rejects.toThrow('The report export returned an empty file.');
  });
});
