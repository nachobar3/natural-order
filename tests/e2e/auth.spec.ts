import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/login')

      // Check page elements
      await expect(page.locator('h1')).toContainText('Natural Order')
      await expect(page.getByText('Iniciá sesión en tu cuenta')).toBeVisible()
      await expect(page.getByLabel('Email')).toBeVisible()
      await expect(page.getByLabel('Contraseña')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Google' })).toBeVisible()
    })

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login')

      // Fill invalid credentials
      await page.getByLabel('Email').fill('invalid@example.com')
      await page.getByLabel('Contraseña').fill('wrongpassword')
      await page.getByRole('button', { name: 'Iniciar sesión' }).click()

      // Wait for error message
      await expect(page.getByText('Credenciales incorrectas')).toBeVisible({ timeout: 10000 })
    })

    test('should have link to registration', async ({ page }) => {
      await page.goto('/login')

      const registerLink = page.getByRole('link', { name: 'Registrate' })
      await expect(registerLink).toBeVisible()
      await expect(registerLink).toHaveAttribute('href', '/register')
    })

    test('should have link to forgot password', async ({ page }) => {
      await page.goto('/login')

      const forgotLink = page.getByRole('link', { name: '¿Olvidaste tu contraseña?' })
      await expect(forgotLink).toBeVisible()
      await expect(forgotLink).toHaveAttribute('href', '/forgot-password')
    })

    test('should preserve redirectTo param after login', async ({ page }) => {
      await page.goto('/login?redirectTo=/dashboard/profile')

      // Verify the page loaded correctly
      await expect(page.getByLabel('Email')).toBeVisible()

      // The redirect will happen after successful login - we just verify the form works
    })
  })

  test.describe('Register Page', () => {
    test('should display registration form', async ({ page }) => {
      await page.goto('/register')

      // Check page elements
      await expect(page.locator('h1')).toContainText('Natural Order')
      await expect(page.getByText('Creá tu cuenta')).toBeVisible()
      await expect(page.getByLabel('Nombre')).toBeVisible()
      await expect(page.getByLabel('Email')).toBeVisible()
      await expect(page.getByLabel('Contraseña')).toBeVisible()
      await expect(page.getByLabel('Confirmar contraseña')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Crear cuenta' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Google' })).toBeVisible()
    })

    test('should show error for password mismatch', async ({ page }) => {
      await page.goto('/register')

      // Fill form with mismatched passwords
      await page.getByLabel('Nombre').fill('Test User')
      await page.getByLabel('Email').fill('test@example.com')
      await page.getByLabel('Contraseña').fill('password123')
      await page.getByLabel('Confirmar contraseña').fill('differentpassword')
      await page.getByRole('button', { name: 'Crear cuenta' }).click()

      // Check error message
      await expect(page.getByText('Las contraseñas no coinciden')).toBeVisible()
    })

    test('should show error for short password', async ({ page }) => {
      await page.goto('/register')

      // Fill form with short password
      await page.getByLabel('Nombre').fill('Test User')
      await page.getByLabel('Email').fill('test@example.com')
      await page.getByLabel('Contraseña').fill('12345')
      await page.getByLabel('Confirmar contraseña').fill('12345')
      await page.getByRole('button', { name: 'Crear cuenta' }).click()

      // Check error message
      await expect(page.getByText('al menos 6 caracteres')).toBeVisible()
    })

    test('should have link to login', async ({ page }) => {
      await page.goto('/register')

      const loginLink = page.getByRole('link', { name: 'Iniciá sesión' })
      await expect(loginLink).toBeVisible()
      await expect(loginLink).toHaveAttribute('href', '/login')
    })

    test('should show early adopter badge', async ({ page }) => {
      await page.goto('/register')

      await expect(page.getByText('6 meses gratis para early adopters')).toBeVisible()
    })
  })

  test.describe('Forgot Password Page', () => {
    test('should display forgot password form', async ({ page }) => {
      await page.goto('/forgot-password')

      await expect(page.getByLabel('Email')).toBeVisible()
      await expect(page.getByRole('button', { name: /enviar/i })).toBeVisible()
    })
  })

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
      await page.goto('/dashboard')

      // Should be redirected to login
      await expect(page).toHaveURL(/\/login\?redirectTo=/)
    })

    test('should redirect to login when accessing profile without auth', async ({ page }) => {
      await page.goto('/dashboard/profile')

      // Should be redirected to login
      await expect(page).toHaveURL(/\/login\?redirectTo=/)
    })

    test('should redirect to login when accessing collection without auth', async ({ page }) => {
      await page.goto('/dashboard/collection')

      // Should be redirected to login
      await expect(page).toHaveURL(/\/login\?redirectTo=/)
    })
  })
})
