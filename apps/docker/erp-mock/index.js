const express = require('express');
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3001;

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'erp-mock' });
});

// Inventory posting endpoint
app.post('/inventory/postings', (req, res) => {
    const isFailMode = process.env.FAIL_MODE === 'true';

    if (isFailMode) {
        return res.status(500).json({
            status: 'error',
            message: 'Simulated ERP inventory posting failure'
        });
    }

    return res.status(201).json({
        status: 'posted',
        inventory_transaction_id: `INV-TXN-${Date.now()}`
    });
});

// Financial accounting journal entry endpoint
app.post('/finance/journal-entries', (req, res) => {
    const isFailMode = process.env.FAIL_MODE === 'true';

    if (isFailMode) {
        return res.status(500).json({
            status: 'error',
            message: 'Simulated ERP journal entry failure'
        });
    }

    return res.status(201).json({
        status: 'posted',
        journal_entry_id: `JE-TXN-${Date.now()}`
    });
});

app.listen(PORT, () => {
    console.log(`ERP Mock service listening on port ${PORT}`);
});