/**
 * Simple password-based authentication for admin routes
 * Compares against ADMIN_PASSWORD environment variable
 */
export function checkAdminPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD environment variable is not set');
  }

  return password === adminPassword;
}
