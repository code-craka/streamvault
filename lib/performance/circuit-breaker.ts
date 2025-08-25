/**
 * Circuit Breaker pattern implementation for service resilience
 * Provides automatic failure detection and recovery
 */

export interface CircuitBreakerOptions {
  failureThreshold: number
  recoveryTimeout: number
  monitoringPeriod: number
  expectedErrors?: string[]
  onStateChange?: (state: CircuitBreakerState) => void
  onFailure?: (error: Error) => void
}

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, rejecting requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerStats {
  state: CircuitBreakerState
  failureCount: number
  successCount: number
  totalRequests: number
  lastFailureTime?: number
  lastSuccessTime?: number
  nextAttempt?: number
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED
  private failureCount = 0
  private successCount = 0
  private totalRequests = 0
  private lastFailureTime?: number
  private lastSuccessTime?: number
  private nextAttempt?: number
  private options: Required<CircuitBreakerOptions>

  constructor(options: CircuitBreakerOptions) {
    this.options = {
      failureThreshold: options.failureThreshold,
      recoveryTimeout: options.recoveryTimeout,
      monitoringPeriod: options.monitoringPeriod,
      expectedErrors: options.expectedErrors || [],
      onStateChange: options.onStateChange || (() => {}),
      onFailure: options.onFailure || (() => {}),
    }
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.totalRequests++

    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN
        this.options.onStateChange(this.state)
      } else {
        throw new Error(`Circuit breaker is OPEN. Next attempt at ${new Date(this.nextAttempt!)}`)
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure(error as Error)
      throw error
    }
  }

  private onSuccess(): void {
    this.successCount++
    this.lastSuccessTime = Date.now()

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.reset()
    }
  }

  private onFailure(error: Error): void {
    this.failureCount++
    this.lastFailureTime = Date.now()
    this.options.onFailure(error)

    if (this.isExpectedError(error)) {
      return // Don't count expected errors towards circuit breaker
    }

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.trip()
    } else if (this.failureCount >= this.options.failureThreshold) {
      this.trip()
    }
  }

  private isExpectedError(error: Error): boolean {
    return this.options.expectedErrors.some(expectedError =>
      error.message.includes(expectedError) || error.name === expectedError
    )
  }

  private shouldAttemptReset(): boolean {
    return Date.now() >= (this.nextAttempt || 0)
  }

  private trip(): void {
    this.state = CircuitBreakerState.OPEN
    this.nextAttempt = Date.now() + this.options.recoveryTimeout
    this.options.onStateChange(this.state)
  }

  private reset(): void {
    this.state = CircuitBreakerState.CLOSED
    this.failureCount = 0
    this.nextAttempt = undefined
    this.options.onStateChange(this.state)
  }

  public getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttempt: this.nextAttempt,
    }
  }

  public forceOpen(): void {
    this.state = CircuitBreakerState.OPEN
    this.nextAttempt = Date.now() + this.options.recoveryTimeout
    this.options.onStateChange(this.state)
  }

  public forceClose(): void {
    this.reset()
  }

  public forceClosed(): void {
    this.reset()
  }
}

// Circuit breaker registry for managing multiple circuit breakers
export class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>()

  public register(name: string, options: CircuitBreakerOptions): CircuitBreaker {
    const breaker = new CircuitBreaker(options)
    this.breakers.set(name, breaker)
    return breaker
  }

  public get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name)
  }

  public getAll(): Map<string, CircuitBreaker> {
    return new Map(this.breakers)
  }

  public getStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {}
    
    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getStats()
    }

    return stats
  }

  public remove(name: string): boolean {
    return this.breakers.delete(name)
  }

  public clear(): void {
    this.breakers.clear()
  }
}

// Global registry instance
export const circuitBreakerRegistry = new CircuitBreakerRegistry()

// Utility function to create a circuit breaker with common defaults
export function createCircuitBreaker(
  name: string,
  options: Partial<CircuitBreakerOptions> = {}
): CircuitBreaker {
  const defaultOptions: CircuitBreakerOptions = {
    failureThreshold: 5,
    recoveryTimeout: 60000, // 1 minute
    monitoringPeriod: 10000, // 10 seconds
    expectedErrors: ['ValidationError', 'AuthenticationError'],
    ...options,
  }

  return circuitBreakerRegistry.register(name, defaultOptions)
}

// Decorator for automatic circuit breaker wrapping
export function withCircuitBreaker(
  name: string,
  options?: Partial<CircuitBreakerOptions>
) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value!
    const breaker = createCircuitBreaker(name, options)

    descriptor.value = async function (...args: any[]) {
      return breaker.execute(() => originalMethod.apply(this, args))
    } as T

    return descriptor
  }
}

// React hook for circuit breaker monitoring
export function useCircuitBreaker(name: string) {
  const breaker = circuitBreakerRegistry.get(name)
  
  return {
    breaker,
    stats: breaker?.getStats(),
    isOpen: breaker?.getStats().state === CircuitBreakerState.OPEN,
    isHalfOpen: breaker?.getStats().state === CircuitBreakerState.HALF_OPEN,
    isClosed: breaker?.getStats().state === CircuitBreakerState.CLOSED,
  }
}