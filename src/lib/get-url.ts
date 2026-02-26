export function getSiteUrl(): string {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ??       // set manually in Vercel for production
    process.env.NEXT_PUBLIC_VERCEL_URL ??      // auto-set by Vercel for preview deploys
    'http://localhost:3000'

  // Ensure https in production
  url = url.startsWith('http') ? url : `https://${url}`
  // Ensure trailing slash
  url = url.endsWith('/') ? url : `${url}/`
  return url
}
