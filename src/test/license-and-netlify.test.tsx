import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  computeOfflineChecksum,
  validateLicenseOffline,
  SAMPLE_LICENSES,
} from '../context/LicenseContext';
import cloudLicenseHandler from '../../netlify/functions/license-check.mts';

describe('Cloud License Verification Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Offline Cryptographic Key Validation', () => {
    it('validates preset commercial licenses without email dependency', () => {
      const proResult = validateLicenseOffline('INVG-PRO-20271231-A9F4');
      expect(proResult.valid).toBe(true);
      expect(proResult.status).toBe('active');
      expect(proResult.tier).toBe('Commercial Pro');
      expect(proResult.tierCode).toBe('PRO');
      expect(proResult.seats).toBe(5);

      const entResult = validateLicenseOffline('INVG-ENT-20280630-B82C');
      expect(entResult.valid).toBe(true);
      expect(entResult.status).toBe('active');
      expect(entResult.tier).toBe('Enterprise Unlimited');
      expect(entResult.tierCode).toBe('ENT');
      expect(entResult.seats).toBe(50);

      const lifeResult = validateLicenseOffline('INVG-LIFE-99991231-F00D');
      expect(lifeResult.valid).toBe(true);
      expect(lifeResult.status).toBe('active');
      expect(lifeResult.tier).toBe('Lifetime Perpetual');
      expect(lifeResult.tierCode).toBe('LIFE');
      expect(lifeResult.daysRemaining).toBeGreaterThan(10000);
    });

    it('generates matching checksums and validates dynamic future keys', () => {
      const tier = 'PRO';
      const futureDate = '20291231';
      const checksum = computeOfflineChecksum(tier, futureDate);
      expect(checksum).toHaveLength(4);

      const dynamicKey = `INVG-${tier}-${futureDate}-${checksum}`;
      const result = validateLicenseOffline(dynamicKey);
      expect(result.valid).toBe(true);
      expect(result.status).toBe('active');
      expect(result.tierCode).toBe('PRO');
      expect(result.expiresAt?.startsWith('2029-12-31')).toBe(true);
    });

    it('rejects keys with tampered checksum signatures', () => {
      const tampered = 'INVG-PRO-20291231-0000';
      const result = validateLicenseOffline(tampered);
      expect(result.valid).toBe(false);
      expect(result.status).toBe('invalid');
      expect(result.message).toContain('Cryptographic signature verification failed');
    });

    it('rejects expired dynamic licenses', () => {
      const tier = 'PRO';
      const pastDate = '20200101';
      const checksum = computeOfflineChecksum(tier, pastDate);
      const expiredKey = `INVG-${tier}-${pastDate}-${checksum}`;

      const result = validateLicenseOffline(expiredKey);
      expect(result.valid).toBe(false);
      expect(result.status).toBe('expired');
      expect(result.daysRemaining).toBe(0);
    });

    it('rejects malformed key strings', () => {
      const malformed = 'INVALID-KEY-123';
      const result = validateLicenseOffline(malformed);
      expect(result.valid).toBe(false);
      expect(result.status).toBe('invalid');
      expect(result.message).toContain('Expected format: INVG-TIER-YYYYMMDD-XXXX');
    });
  });

  describe('Cloud Serverless Function Handler', () => {
    it('handles OPTIONS CORS preflight requests', async () => {
      const req = new Request('https://rushi-invoice-templates.netlify.app/.netlify/functions/license-check', {
        method: 'OPTIONS',
      });
      const res = await cloudLicenseHandler(req, {} as any);
      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('serves server metadata on GET without key parameter', async () => {
      const req = new Request('https://rushi-invoice-templates.netlify.app/.netlify/functions/license-check', {
        method: 'GET',
      });
      const res = await cloudLicenseHandler(req, {} as any);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('online');
      expect(json.server).toContain('Cloud Functions License Server');
    });

    it('validates normal license key via POST payload without requiring email', async () => {
      const req = new Request('https://rushi-invoice-templates.netlify.app/.netlify/functions/license-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: 'INVG-PRO-20271231-A9F4',
        }),
      });
      const res = await cloudLicenseHandler(req, {} as any);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.valid).toBe(true);
      expect(json.status).toBe('active');
      expect(json.tier).toBe('Commercial Pro');
      expect(json.features).toContain('consolidated_monthly');
      expect(json.features).toContain('excel_export');
    });

    it('rejects unknown license key via POST payload', async () => {
      const req = new Request('https://rushi-invoice-templates.netlify.app/.netlify/functions/license-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: 'INVG-FAKE-KEY',
        }),
      });
      const res = await cloudLicenseHandler(req, {} as any);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.valid).toBe(false);
      expect(json.status).toBe('invalid');
    });
  });
});
