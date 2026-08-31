const express = require('express');
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3001;

// Middleware to check for FAIL_MODE toggle
const checkFailMode = (req, res, next) => {
    const failMode = process.env.FAIL_MODE === 'true';
    if (failMode) {
        return res.status(500).json({
            status: 'error',
            message: 'Simulated ERP integration failure (FAIL_MODE is active)',
            timestamp: new Date().toISOString()
        });
    }
    next();
};

app.use(checkFailMode);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'erp-mock' });
});

// SRS 7.1: Postings to Inventory Management Module
app.post('/inventory/postings', (req, res) => {
    const payload = req.body;
    console.log('[ERP MOCK] Received Inventory Posting:', JSON.stringify(payload, null, 2));

    res.status(201).json({
        status: 'success',
        postingId: `INV-${Date.now()}`,
        message: 'Landed cost posted to inventory master successfully',
        data: payload
    });
});

// SRS 7.2: Postings to Financial Accounting Journal Entries
app.post('/finance/journal-entries', (req, res) => {
    const payload = req.body;
    console.log('[ERP MOCK] Received Journal Entry:', JSON.stringify(payload, null, 2));

    res.status(201).json({
        status: 'success',
        journalEntryId: `JE-${Date.now()}`,
        message: 'Double-entry journal posted successfully',
        data: payload
    });
});

app.listen(PORT, () => {
    console.log(`ERP Mock service running on port ${PORT}`);
});