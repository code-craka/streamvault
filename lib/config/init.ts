// Configuration initialization for server-side components
import { initializeConfiguration } from './startup'

let isInitialized = false

export function ensureConfigurationInitialized() {
    if (typeof window !== 'undefined') {
        // Client-side, no initialization needed
        return
    }

    if (!isInitialized) {
        try {
            initializeConfiguration()
            isInitialized = true
        } catch (error) {
            console.error('Failed to initialize configuration:', error)
            throw error
        }
    }
}

// Auto-initialize when this module is imported on the server
if (typeof window === 'undefined') {
    ensureConfigurationInitialized()
}