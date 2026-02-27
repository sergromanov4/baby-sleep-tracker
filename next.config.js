/** @type {import('next').NextConfig} */
const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
const [owner, repo] = process.env.GITHUB_REPOSITORY?.split('/') ?? [];
const isUserOrOrgPage = repo && owner && repo.toLowerCase() === `${owner.toLowerCase()}.github.io`;
const basePath =
  process.env.NEXT_PUBLIC_BASE_PATH ??
  (isGithubActions && repo && !isUserOrOrgPage ? `/${repo}` : '');

const nextConfig = {
  reactStrictMode: true,
  // Export static HTML for GitHub Pages.
  output: 'export',
  // Generate /route/index.html so direct route hits like /profile work on static hosting.
  trailingSlash: true,
  // Ensure assets/links work when the site is served from /<repo>.
  basePath,
  assetPrefix: basePath || undefined,
  // Disable image optimization to allow static export without the image proxy.
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
