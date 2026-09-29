const fs = require('fs');
let content = fs.readFileSync('apps/backend/src/goods-receipts/insomnia-flow.spec.ts', 'utf8');

// Replace fetchMock with individual mocks
content = content.replace('let fetchMock: jest.Mock;', 'let inventoryMock: jest.Mock;\n  let financeMock: jest.Mock;');

content = content.replace(
  `    fetchMock = jest.fn().mockResolvedValue({\n      ok: true,\n      text: async () => JSON.stringify({ transaction_id: 'ERP-INV-12345' }),\n      json: async () => ({ transaction_id: 'ERP-INV-12345' }),\n    });\n    global.fetch = fetchMock;`,
  `    inventoryMock = jest.fn().mockResolvedValue({ transaction_id: 'ERP-INV-12345' });\n    financeMock = jest.fn().mockResolvedValue({ transaction_id: 'ERP-FIN-12345' });`
);

content = content.replace(
  `{ provide: FinanceClient, useValue: { postTransaction: jest.fn() } }`,
  `{ provide: FinanceClient, useValue: { postTransaction: financeMock } }`
);

content = content.replace(
  `{ provide: InventoryClient, useValue: { postReceipt: jest.fn() } }`,
  `{ provide: InventoryClient, useValue: { postReceipt: inventoryMock } }`
);

content = content.replace(
  `    expect(fetchMock).toHaveBeenCalledTimes(2);\n\n    const inventoryCall = fetchMock.mock.calls[0];\n    const inventoryPayload = JSON.parse(inventoryCall[1].body);\n\n    expect(inventoryPayload.items).toHaveLength(1);\n    expect(inventoryPayload.items[0].shipment_item_id).toBe('item-valid');\n    expect(inventoryPayload.items[0].quantity_received).toBe('100');\n\n    const financeCall = fetchMock.mock.calls[1];\n    const financePayload = JSON.parse(financeCall[1].body);`,
  `    expect(inventoryMock).toHaveBeenCalledTimes(1);\n    expect(financeMock).toHaveBeenCalledTimes(1);\n\n    const inventoryPayload = inventoryMock.mock.calls[0][0];\n\n    expect(inventoryPayload).toHaveLength(1);\n    expect(inventoryPayload[0].shipment_item_id).toBe('item-valid');\n    expect(inventoryPayload[0].quantity_received).toBe('100');\n\n    const financePayload = financeMock.mock.calls[0][0];`
);

fs.writeFileSync('apps/backend/src/goods-receipts/insomnia-flow.spec.ts', content);
console.log('Fixed insomnia-flow.spec.ts');
