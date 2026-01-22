// Force dynamic rendering for auth pages to avoid prerendering issues with Supabase client
export const dynamic = 'force-dynamic'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
