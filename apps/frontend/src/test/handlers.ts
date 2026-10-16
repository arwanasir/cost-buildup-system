import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:3000/api';

export const handlers = [
  // Auth Handlers
  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as any;
    if (body.username === 'admin' && body.password === 'admin') {
      return HttpResponse.json({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        user: {
          id: '1',
          username: 'admin',
          role: 'system_admin',
          name: 'Admin User',
        },
        permissions: ['*'],
      });
    }
    return new HttpResponse('Unauthorized', { status: 401 });
  }),

  http.get(`${API_URL}/auth/me`, () => {
    return HttpResponse.json({
      user: {
        id: '1',
        username: 'admin',
        role: 'system_admin',
        name: 'Admin User',
      },
      permissions: ['*'],
    });
  }),

  // Suppliers Handlers
  http.get(`${API_URL}/suppliers`, () => {
    return HttpResponse.json({
      data: [
        { id: 'sup-1', name: 'Supplier A', country: 'CN', status: 'ACTIVE' },
        { id: 'sup-2', name: 'Supplier B', country: 'IN', status: 'ACTIVE' },
      ],
      total: 2,
      page: 1,
      limit: 10,
    });
  }),

  http.get(`${API_URL}/suppliers/:id`, ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: `Supplier ${params.id}`,
      country: 'CN',
      status: 'ACTIVE',
    });
  }),

  // Purchase Orders Handlers
  http.get(`${API_URL}/purchase-orders`, () => {
    return HttpResponse.json({
      data: [
        {
          id: 'po-1',
          poNumber: 'PO-001',
          status: 'APPROVED',
          supplierId: 'sup-1',
          totalAmount: '15000',
        },
        {
          id: 'po-2',
          poNumber: 'PO-002',
          status: 'DRAFT',
          supplierId: 'sup-2',
          totalAmount: '5000',
        },
      ],
      total: 2,
      page: 1,
      limit: 10,
    });
  }),

  http.get(`${API_URL}/purchase-orders/outstanding`, () => {
    return HttpResponse.json([
      {
        id: 'po-1',
        poNumber: 'PO-001',
        status: 'APPROVED',
        supplierId: 'sup-1',
        totalAmount: '15000',
      },
    ]);
  }),

  http.get(`${API_URL}/purchase-orders/:id`, ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      poNumber: `PO-${params.id}`,
      status: 'APPROVED',
      supplierId: 'sup-1',
      totalAmount: '15000',
      lines: [],
    });
  }),

  // Cost Entries Handlers
  http.get(`${API_URL}/import-shipments/:shipmentId/cost-entries`, () => {
    return HttpResponse.json([
      {
        id: 'ce-1',
        shipmentId: 'ship-1',
        category: { id: 'cat-1', name: 'Freight', code: 'FRT' },
        amountEtb: '5000',
        amountForeign: null,
        exchangeRate: null,
        isEstimated: false,
        referenceNumber: 'INV-001',
        description: 'Ocean Freight',
        vendor: 'Maersk',
      },
    ]);
  }),

  http.post(
    `${API_URL}/import-shipments/:shipmentId/cost-entries`,
    async ({ request }) => {
      const body = (await request.json()) as any;
      return HttpResponse.json(
        {
          id: 'ce-new',
          ...body,
          amountEtb: '1000',
        },
        { status: 201 },
      );
    },
  ),
];
