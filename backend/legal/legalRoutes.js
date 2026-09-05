const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../auth/authMiddleware');
const { aiEndpointLimit } = require('../shared/rateLimiter');
const { generateLegalDocument, getLegalDocuments } = require('./legalService');

router.post('/startups/:id/legal-documents', requireAuth, requireRole('FOUNDER'), aiEndpointLimit, async (req, res) => {
  const { documentType } = req.body;
  const result = await generateLegalDocument(req.params.id, documentType);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});
router.get('/startups/:id/legal-documents', requireAuth, async (req, res) => res.json(await getLegalDocuments(req.params.id)));

module.exports = router;
