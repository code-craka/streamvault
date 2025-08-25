import { z } from 'zod'

// Common validation schemas
export const emailSchema = z.string().email('Invalid email format')
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
    'Password must contain uppercase, lowercase, number and special character')

export const userIdSchema = z.string().min(1, 'User ID is required')
export const streamIdSchema = z.string().min(1, 'Stream ID is required')
export const videoIdSchema = z.string().min(1, 'Video ID is required')

// API request validation schemas
export const createStreamSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().max(500, 'Description too long').optional(),
  category: z.string().min(1, 'Category is required'),
  isPrivate: z.boolean().default(false),
  tags: z.array(z.string()).max(10, 'Too many tags').optional(),
})

export const updateStreamSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  category: z.string().min(1, 'Category is required').optional(),
  isPrivate: z.boolean().optional(),
  tags: z.array(z.string()).max(10, 'Too many tags').optional(),
})

export const chatMessageSchema = z.object({
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(500, 'Message too long')
    .refine(msg => !msg.includes('<script'), 'Invalid content detected'),
  streamId: z.string().min(1, 'Stream ID is required'),
})

export const subscriptionSchema = z.object({
  tier: z.enum(['basic', 'premium', 'pro'], {
    errorMap: () => ({ message: 'Invalid subscription tier' })
  }),
  priceId: z.string().min(1, 'Price ID is required'),
})

export const videoUploadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  category: z.string().min(1, 'Category is required'),
  tags: z.array(z.string()).max(15, 'Too many tags').optional(),
  isPrivate: z.boolean().default(false),
  requiredTier: z.enum(['basic', 'premium', 'pro']).default('basic'),
})

// Security-specific validation
export const ipAddressSchema = z.string().ip('Invalid IP address')
export const userAgentSchema = z.string().max(500, 'User agent too long')
export const timestampSchema = z.number().int().positive('Invalid timestamp')

export const securityEventSchema = z.object({
  eventType: z.enum([
    'login_attempt',
    'failed_login',
    'suspicious_activity',
    'rate_limit_exceeded',
    'unauthorized_access',
    'data_breach_attempt',
    'malicious_content'
  ]),
  userId: z.string().optional(),
  ipAddress: ipAddressSchema,
  userAgent: userAgentSchema,
  timestamp: timestampSchema,
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  details: z.record(z.any()).optional(),
})

// Rate limiting validation
export const rateLimitSchema = z.object({
  identifier: z.string().min(1, 'Identifier is required'),
  action: z.string().min(1, 'Action is required'),
  limit: z.number().int().positive('Limit must be positive'),
  window: z.number().int().positive('Window must be positive'),
})

// Content moderation validation
export const contentModerationSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  contentType: z.enum(['text', 'image', 'video', 'audio']),
  userId: z.string().min(1, 'User ID is required'),
  context: z.record(z.any()).optional(),
})

// Audit trail validation
export const auditLogSchema = z.object({
  action: z.string().min(1, 'Action is required'),
  userId: z.string().min(1, 'User ID is required'),
  resourceType: z.string().min(1, 'Resource type is required'),
  resourceId: z.string().min(1, 'Resource ID is required'),
  changes: z.record(z.any()).optional(),
  ipAddress: ipAddressSchema,
  userAgent: userAgentSchema,
  timestamp: timestampSchema,
})

// Validation helper functions
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`)
    }
    throw error
  }
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
}

export function validateAndSanitize<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const validated = validateRequest(schema, data)
  
  // Recursively sanitize string fields
  function sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return sanitizeInput(obj)
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject)
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value)
      }
      return sanitized
    }
    return obj
  }
  
  return sanitizeObject(validated)
}