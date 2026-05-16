// Root redirect is handled by middleware.ts:
//   authenticated  → /portfolios
//   unauthenticated → /login
// This page is never reached under normal circumstances.
export default function RootPage() {
  return null;
}
