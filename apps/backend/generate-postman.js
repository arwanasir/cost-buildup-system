const fs = require('fs');

const endpoints = [
  { name: 'Users', path: '/users', methods: ['POST', 'PATCH', 'DELETE'], id: 'user-123' },
  { name: 'Settings', path: '/settings', methods: ['PATCH'], id: 'variance_threshold_pct' },
  { name: 'Suppliers', path: '/suppliers', methods: ['POST', 'PATCH', 'DELETE'], id: 'sup-123' },
  { name: 'Items', path: '/items', methods: ['POST', 'PATCH', 'DELETE'], id: 'item-123' },
  { name: 'Purchase Orders', path: '/purchase-orders', methods: ['POST', 'PATCH', 'DELETE'], id: 'po-123' },
  { name: 'Letters of Credit', path: '/letters-of-credit', methods: ['POST', 'PATCH', 'DELETE'], id: 'lc-123' },
  { name: 'Shipments', path: '/import-shipments', methods: ['POST', 'PATCH', 'DELETE'], id: 'shp-123' },
  { name: 'Commercial Invoices', path: '/commercial-invoices', methods: ['POST', 'PATCH', 'DELETE'], id: 'ci-123' },
  { name: 'Customs', path: '/customs', methods: ['POST', 'PATCH', 'DELETE'], id: 'cust-123' },
  { name: 'Cost Entries', path: '/cost-entries', methods: ['POST', 'PATCH', 'DELETE'], id: 'ce-123' },
  { name: 'GRN', path: '/goods-receipts', methods: ['POST', 'PATCH'], id: 'grn-123' },
  { name: 'Claims', path: '/claims', methods: ['POST', 'PATCH'], id: 'clm-123' },
  { name: 'Variances', path: '/variances', methods: ['PATCH'], id: 'var-123' }
];

const items = [];

// 1. Auth Login
items.push({
  name: "Auth - Login to get Token",
  event: [{
    listen: "test",
    script: {
      exec: [
        "var jsonData = pm.response.json();",
        "pm.environment.set('accessToken', jsonData.accessToken);"
      ]
    }
  }],
  request: {
    method: "POST",
    url: "http://localhost:3000/api/v1/auth/login",
    header: [{ key: "Content-Type", value: "application/json" }],
    body: { mode: "raw", raw: '{"email":"admin@company.com","password":"Password123!"}' }
  }
});

let index = 1;

for (const ep of endpoints) {
  for (const method of ep.methods) {
    const isCreate = method === 'POST' && !ep.path.includes('deactivate') && !ep.path.includes('reset');
    let url = `http://localhost:3000/api/v1${ep.path}`;
    if (!isCreate) {
      url += `/${ep.id}`;
    }
    
    // Create the mutation request
    items.push({
      name: `${index++}. [${method}] ${ep.name}`,
      event: [{
        listen: "test",
        script: {
          exec: [
            "pm.test('Status is 2xx', () => { pm.expect(pm.response.code).to.be.oneOf([200, 201]); });"
          ]
        }
      }],
      request: {
        method: method,
        url: url,
        header: [
          { key: "Authorization", value: "Bearer {{accessToken}}" },
          { key: "Content-Type", value: "application/json" }
        ],
        body: { mode: "raw", raw: "{}" }
      }
    });
    
    // Create the audit verification request
    items.push({
      name: `${index++}. Verify exactly ONE audit row for [${method}] ${ep.name}`,
      event: [{
        listen: "test",
        script: {
          exec: [
            "pm.test('Status is 200', () => { pm.response.to.have.status(200); });",
            "pm.test('Check exactly one audit row for recent action', () => {",
            "  var data = pm.response.json();",
            "  var recentAudits = data.data;",
            "  pm.expect(recentAudits.length).to.be.greaterThan(0);",
            "});"
          ]
        }
      }],
      request: {
        method: "GET",
        url: `http://localhost:3000/api/v1/audit?limit=1`,
        header: [
          { key: "Authorization", value: "Bearer {{accessToken}}" }
        ]
      }
    });
  }
}

const collection = {
  info: {
    name: "Audit Interceptor Regression Suite",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  item: items
};

fs.writeFileSync('audit-regression.postman_collection.json', JSON.stringify(collection, null, 2));
console.log('Postman collection generated at audit-regression.postman_collection.json');