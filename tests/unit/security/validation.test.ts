import { 
  validateRequest, 
  sanitizeInput, 
  validateAndSanitize,
  createStreamSchema,
  chatMessageSchema,
  securityEventSchema
} from '@/lib/security/validation'

describe('Security Validation', () => {
  describe('validateRequest', () => {
    it('should validate correct data', () => {
      const validData = {
        title: 'Test Stream',
        description: 'A test stream',
        category: 'gaming',
        isPrivate: false
      }

      const result = validateRequest(createStreamSchema, validData)
      expect(result).toEqual(validData)
    })

    it('should throw error for invalid data', () => {
      const invalidData = {
        title: '', // Empty title should fail
        category: 'gaming'
      }

      expect(() => validateRequest(createStreamSchema, invalidData))
        .toThrow('Validation failed')
    })

    it('should validate chat messages', () => {
      const validMessage = {
        message: 'Hello world!',
        streamId: 'stream123'
      }

      const result = validateRequest(chatMessageSchema, validMessage)
      expect(result).toEqual(validMessage)
    })

    it('should reject malicious chat messages', () => {
      const maliciousMessage = {
        message: 'Hello <script>alert("xss")</script>',
        streamId: 'stream123'
      }

      expect(() => validateRequest(chatMessageSchema, maliciousMessage))
        .toThrow('Invalid content detected')
    })
  })

  describe('sanitizeInput', () => {
    it('should remove script tags', () => {
      const input = 'Hello <script>alert("xss")</script> world'
      const result = sanitizeInput(input)
      expect(result).toBe('Hello  world')
    })

    it('should remove javascript: protocols', () => {
      const input = 'Click <a href="javascript:alert(1)">here</a>'
      const result = sanitizeInput(input)
      expect(result).toBe('Click <a href="">here</a>')
    })

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(1)">Click me</div>'
      const result = sanitizeInput(input)
      expect(result).toBe('<div >Click me</div>')
    })

    it('should preserve safe content', () => {
      const input = 'This is safe content with <b>bold</b> text'
      const result = sanitizeInput(input)
      expect(result).toBe('This is safe content with <b>bold</b> text')
    })
  })

  describe('validateAndSanitize', () => {
    it('should validate and sanitize data', () => {
      const data = {
        message: 'Hello <script>alert("xss")</script> world',
        streamId: 'stream123'
      }

      const result = validateAndSanitize(chatMessageSchema, data)
      expect(result.message).toBe('Hello  world')
      expect(result.streamId).toBe('stream123')
    })

    it('should handle nested objects', () => {
      const data = {
        title: 'Test <script>alert(1)</script>',
        description: 'Safe description',
        category: 'gaming',
        tags: ['tag1', 'tag2<script>alert(1)</script>']
      }

      const result = validateAndSanitize(createStreamSchema, data)
      expect(result.title).toBe('Test ')
      expect(result.description).toBe('Safe description')
      expect(result.tags).toEqual(['tag1', 'tag2'])
    })
  })

  describe('securityEventSchema', () => {
    it('should validate security events', () => {
      const validEvent = {
        eventType: 'login_attempt',
        userId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        timestamp: Date.now(),
        severity: 'low',
        details: { success: true }
      }

      const result = validateRequest(securityEventSchema, validEvent)
      expect(result).toEqual(validEvent)
    })

    it('should reject invalid IP addresses', () => {
      const invalidEvent = {
        eventType: 'login_attempt',
        ipAddress: 'invalid-ip',
        userAgent: 'Mozilla/5.0...',
        timestamp: Date.now(),
        severity: 'low'
      }

      expect(() => validateRequest(securityEventSchema, invalidEvent))
        .toThrow('Invalid IP address')
    })

    it('should reject invalid event types', () => {
      const invalidEvent = {
        eventType: 'invalid_event',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        timestamp: Date.now(),
        severity: 'low'
      }

      expect(() => validateRequest(securityEventSchema, invalidEvent))
        .toThrow()
    })
  })
})