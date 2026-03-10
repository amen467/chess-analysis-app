type CspDirectives = Record<string, string[]>

const cspDirectives: CspDirectives = {
  'default-src': ["'self'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'object-src': ["'none'"],
  'script-src': ["'self'", "'wasm-unsafe-eval'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:'],
  'font-src': ["'self'", 'data:'],
  'connect-src': ["'self'", 'https://api.openai.com'],
  'worker-src': ["'self'", 'blob:'],
  'manifest-src': ["'self'"],
  'upgrade-insecure-requests': [],
  'block-all-mixed-content': [],
}

const serializeCsp = (directives: CspDirectives) =>
  Object.entries(directives)
    .map(([directive, values]) => (values.length ? `${directive} ${values.join(' ')}` : directive))
    .join('; ')

export const contentSecurityPolicy = serializeCsp(cspDirectives)

export const securityHeaders = Object.freeze({
  'Content-Security-Policy': contentSecurityPolicy,
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
})

const { 'Content-Security-Policy': _omitCsp, ...baseHeadersWithoutCsp } = securityHeaders

export const reportOnlySecurityHeaders = Object.freeze({
  ...baseHeadersWithoutCsp,
  'Content-Security-Policy-Report-Only': contentSecurityPolicy,
})

const parseCsp = (policy: string) => {
  const parsed = new Map<string, string[]>()
  const directives = policy
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)

  for (const directive of directives) {
    const [name, ...values] = directive.split(/\s+/)
    if (!name) continue
    parsed.set(name, values)
  }

  return parsed
}

export const validateSecurityHeaders = (
  headers: Record<string, string> = securityHeaders,
): string[] => {
  const issues: string[] = []
  const requiredHeaderNames = [
    'Content-Security-Policy',
    'Strict-Transport-Security',
    'X-Content-Type-Options',
    'Referrer-Policy',
    'X-Frame-Options',
    'Permissions-Policy',
  ]

  for (const headerName of requiredHeaderNames) {
    if (!headers[headerName]) {
      issues.push(`Missing required header: ${headerName}`)
    }
  }

  const csp = headers['Content-Security-Policy']
  if (!csp) {
    issues.push('Content-Security-Policy is missing.')
    return issues
  }

  const parsed = parseCsp(csp)
  const requiredDirectives = ['default-src', 'script-src', 'style-src', 'connect-src', 'worker-src']
  for (const directive of requiredDirectives) {
    if (!parsed.has(directive)) {
      issues.push(`CSP missing directive: ${directive}`)
    }
  }

  const connectSrcValues = parsed.get('connect-src') ?? []
  if (!connectSrcValues.includes('https://api.openai.com')) {
    issues.push('CSP connect-src must allow https://api.openai.com')
  }

  return issues
}
