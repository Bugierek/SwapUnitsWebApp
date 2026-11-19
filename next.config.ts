import type {NextConfig} from 'next';
import { categoryInfoList } from './src/lib/category-info';

// Category subdomains are shortcuts, not separate sites:
//   length.swapunits.com/      -> 308 swapunits.com/measurements/length-conversion
//   <any subdomain>/some/path  -> 308 swapunits.com/some/path   (includes www and unknown names)
// Content deliberately lives only on the apex: localStorage (favorites, history, theme) is per
// hostname, and canonicals, the sitemap and internal links all point at the apex.
//
// This is done with config redirects, NOT Next middleware, on purpose: Firebase App Hosting never
// caches routes that Next middleware touches at its CDN, and a middleware that has to look at the
// host runs on every route. Redirect rules only fire for subdomain hosts, so apex pages stay
// CDN-cacheable.
//
// Requires, per base domain: a wildcard `*` A record at the DNS provider pointing at the App Hosting
// IP, and `*.<domain>` connected as a custom domain on the App Hosting backend.
const BASE_DOMAINS = ['swapunits.com', 'unitswap.xyz'];
const CONVERSION_SUFFIX = '-conversion';
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Behind App Hosting's front end the visitor's hostname may arrive as Host or as X-Forwarded-Host,
// so every rule exists in both forms. (`has` values are matched as whole-string regexes.)
function hostConditions(hostRegex: string) {
  return [
    [{ type: 'host' as const, value: hostRegex }],
    [{ type: 'header' as const, key: 'x-forwarded-host', value: `${hostRegex}(?::\\d+)?(?:,.*)?` }],
  ];
}

function subdomainRedirects() {
  const rules: { source: string; destination: string; permanent: boolean; has: ReturnType<typeof hostConditions>[number] }[] = [];
  const categorySlugs = categoryInfoList.map((info) => info.slug).filter((slug) => slug.endsWith(CONVERSION_SUFFIX));

  // Specific rules first: a category subdomain's root goes to its category page.
  for (const base of BASE_DOMAINS) {
    for (const slug of categorySlugs) {
      const subdomain = slug.slice(0, -CONVERSION_SUFFIX.length);
      for (const has of hostConditions(escapeRegex(`${subdomain}.${base}`))) {
        rules.push({ source: '/', has, destination: `https://${base}/measurements/${slug}`, permanent: true });
      }
    }
  }
  // Then everything else on any subdomain (www, unknown names, non-root paths) goes to the same
  // path on the apex. `.+\.` requires a subdomain, so apex requests never match.
  for (const base of BASE_DOMAINS) {
    for (const has of hostConditions(`.+\\.${escapeRegex(base)}`)) {
      rules.push({ source: '/:path*', has, destination: `https://${base}/:path*`, permanent: true });
    }
  }
  return rules;
}

const nextConfig: NextConfig = {
  async redirects() {
    return subdomainRedirects();
  },
  /* config options here */
  reactStrictMode: true, // Enable React Strict Mode
  // Next 15.2+ "streams" metadata (<title>, meta description, canonical) into <body> for any user
  // agent not matched here - including Googlebot. Google only honors rel=canonical inside <head>,
  // so match every user agent: metadata is then always rendered in <head>.
  htmlLimitedBots: /.*/,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Performance optimizations
  compress: true, // Enable gzip compression
  poweredByHeader: false, // Remove X-Powered-By header
  
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react'], // Tree-shake lucide-react imports
  },
  
  webpack(config) {
    // Enable production optimizations
    config.optimization = {
      ...config.optimization,
      minimize: true,
    };
    return config;
  },
};

export default nextConfig;
