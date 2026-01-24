import { test, expect } from '@playwright/test'

/**
 * Bulk Import E2E Tests
 *
 * Note: These tests verify the UI behavior of the import flow.
 * Full end-to-end tests with actual file uploads and API calls
 * require authentication and are better suited for integration tests.
 */
test.describe('Bulk Import Flow', () => {
  test.describe('Import Page UI (unauthenticated)', () => {
    test('should redirect to login when not authenticated', async ({ page }) => {
      await page.goto('/dashboard/collection/import')

      // Should be redirected to login
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('Import Page UI (requires auth fixture)', () => {
    // These tests would require an authenticated session fixture
    // For now, we test what we can without auth

    test.skip('should display upload area', async ({ page }) => {
      await page.goto('/dashboard/collection/import')

      // Check page elements
      await expect(page.getByText('Importar Colección')).toBeVisible()
      await expect(page.getByText('Arrastrá tu archivo CSV acá')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Seleccionar archivo' })).toBeVisible()
    })

    test.skip('should show supported formats', async ({ page }) => {
      await page.goto('/dashboard/collection/import')

      // Check format help section
      await expect(page.getByText('Formatos soportados')).toBeVisible()
      await expect(page.getByText(/Moxfield/)).toBeVisible()
      await expect(page.getByText(/ManaBox/)).toBeVisible()
      await expect(page.getByText(/Deckbox/)).toBeVisible()
      await expect(page.getByText(/CubeCobra/)).toBeVisible()
    })

    test.skip('should have back link to collection', async ({ page }) => {
      await page.goto('/dashboard/collection/import')

      const backLink = page.getByRole('link', { name: '' }).first() // ArrowLeft icon
      await expect(backLink).toHaveAttribute('href', '/dashboard/collection')
    })
  })
})

test.describe('Wishlist Import Flow', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard/wishlist/import')

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/)
  })
})
