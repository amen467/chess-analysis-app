import { describe, expect, it } from 'vitest'
import {
  contentSecurityPolicy,
  reportOnlySecurityHeaders,
  securityHeaders,
  validateSecurityHeaders,
} from '@/config/securityHeaders'

describe('security headers policy', () => {
  it('has required headers and a valid CSP baseline', () => {
    expect(validateSecurityHeaders(securityHeaders)).toEqual([])
  })

  it('includes OpenAI API in CSP connect-src', () => {
    expect(contentSecurityPolicy).toContain('connect-src')
    expect(contentSecurityPolicy).toContain('https://api.openai.com')
  })

  it('uses report-only CSP variant for development server usage', () => {
    expect(reportOnlySecurityHeaders['Content-Security-Policy-Report-Only']).toBe(contentSecurityPolicy)
    expect('Content-Security-Policy' in reportOnlySecurityHeaders).toBe(false)
  })
})
