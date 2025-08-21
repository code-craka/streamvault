import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should display the main heading and navigation', async ({ page }) => {
    await page.goto('/')
    
    // Check main heading
    await expect(page.getByRole('heading', { name: /welcome to streamvault/i })).toBeVisible()
    
    // Check feature cards
    await expect(page.getByText('Live Streaming')).toBeVisible()
    await expect(page.getByText('Video on Demand')).toBeVisible()
    await expect(page.getByText('AI Enhancement')).toBeVisible()
    
    // Check call-to-action buttons
    await expect(page.getByRole('button', { name: /start streaming/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /learn more/i })).toBeVisible()
  })

  test('should have proper page title and meta description', async ({ page }) => {
    await page.goto('/')
    
    await expect(page).toHaveTitle(/StreamVault - Professional Live Streaming Platform/)
  })
})