# Deploying GanttLab to Netlify

## ✅ Your Project is Already Netlify-Optimized!

All necessary configuration is in place. Just follow these steps:

---

## Quick Deployment (3 Steps)

### 1. Push Your Code to Git

```bash
git add .
git commit -m "Add issue hierarchy feature"
git push origin main
```

### 2. Connect to Netlify

**Option A: Netlify UI** (Easiest)
1. Go to [https://app.netlify.com](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your Git provider (GitHub, GitLab, Bitbucket)
4. Select your `ganttlab` repository
5. Click **"Deploy site"** (settings are already in `netlify.toml`)

**Option B: Netlify CLI**

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize and deploy
netlify init

# Follow prompts - it will detect netlify.toml automatically
```

### 3. Done! 🎉

Your site will be live at: `https://[random-name].netlify.app`

You can customize the domain in Netlify settings.

---

## Why It Works

Your project has optimal Netlify configuration:

### ✅ `netlify.toml` - Build Configuration
- **Node 16**: Avoids OpenSSL issues (Node 17+ problem)
- **Automatic builds**: `postinstall` script builds all libraries
- **SPA routing**: Redirects configured for Vue Router
- **Security headers**: X-Frame-Options, XSS protection, etc.
- **Caching**: Aggressive caching for JS/CSS/images

### ✅ `.nvmrc` - Node Version Lock
- Ensures Node 16 is used consistently
- Works with Netlify's automatic detection

### ✅ Monorepo Structure
- All 3 libraries (`entities`, `use-cases`, `gateways`) build automatically
- No manual intervention needed

---

## Local Development vs Netlify

| Environment | Node Version | Command | Notes |
|-------------|--------------|---------|-------|
| **Netlify** | Node 16 | `npm run build:webapp` | ✅ No OpenSSL flag needed |
| **Local (Node 16)** | Node 16 | `npm run webapp` | ✅ Works without flags |
| **Local (Node 17+)** | Node 22 | `npm run dev` | ✅ Uses legacy OpenSSL flag |

---

## Netlify Build Process

When you deploy, Netlify automatically:

1. **Installs dependencies**: `npm install --legacy-peer-deps`
2. **Runs postinstall**: Builds all 3 libraries
   ```bash
   npm run build:lib:entities
   npm run build:lib:use-cases
   npm run build:lib:gateways
   ```
3. **Builds webapp**: `npm run build:webapp`
4. **Publishes**: `packages/ganttlab-adapter-webapp/dist`

**Expected Build Time**: 2-4 minutes

---

## For Local Development (Node 22)

Since you have Node 22 locally, use:

```bash
# New simplified command (added to package.json)
npm run dev
```

This automatically applies the `--openssl-legacy-provider` flag.

---

## Environment Variables (If Needed)

If you need to add environment variables in Netlify:

1. Go to **Site settings** → **Environment variables**
2. Add your variables (e.g., API keys)
3. In your code, access via `process.env.VUE_APP_YOUR_VAR`

> **Note**: GanttLab runs client-side only and doesn't need server-side env vars. User credentials are stored in browser localStorage.

---

## Custom Domain Setup

To use your own domain:

1. In Netlify: **Domain settings** → **Add custom domain**
2. Follow DNS configuration steps
3. Enable HTTPS (automatic with Netlify)

---

## Continuous Deployment

Once connected, every push to your Git repo triggers:
- ✅ Automatic build
- ✅ Automatic deploy
- ✅ Deploy preview for pull requests

---

## Build Optimization Tips

### Speed Up Builds

Already implemented:
- ✅ Node 16 (faster than 17+)
- ✅ Proper caching headers
- ✅ Monorepo structure

### Reduce Build Time Further

Add to `netlify.toml`:

```toml
[build.processing]
  skip_processing = false
[build.processing.css]
  bundle = true
  minify = true
[build.processing.js]
  bundle = true
  minify = true
[build.processing.html]
  pretty_urls = true
[build.processing.images]
  compress = true
```

---

## Troubleshooting

### Build Fails with OpenSSL Error

**Unlikely** (Node 16 doesn't have this issue), but if it happens:

Add to `netlify.toml`:
```toml
[build.environment]
  NODE_OPTIONS = "--openssl-legacy-provider"
```

### Build Times Out

Increase timeout in Netlify dashboard:
- **Site settings** → **Build & deploy** → **Build settings**
- Increase timeout (default: 15 min)

### Dependencies Fail to Install

Check if `NPM_FLAGS` is set:
```toml
[build.environment]
  NPM_FLAGS = "--legacy-peer-deps"
```

Already configured in your `netlify.toml` ✅

---

## Monitoring

### Build Logs
View real-time build logs in Netlify dashboard:
- **Deploys** → Click on deploy → **Deploy log**

### Performance
Netlify provides:
- ✅ CDN distribution (fast globally)
- ✅ Automatic HTTPS
- ✅ HTTP/2 support
- ✅ Brotli compression

---

## Deploy Contexts

Your `netlify.toml` works for all contexts:

| Context | Trigger | URL |
|---------|---------|-----|
| **Production** | Push to `main` | `your-site.netlify.app` |
| **Branch Deploy** | Push to other branches | `branch--your-site.netlify.app` |
| **Deploy Preview** | Pull request | `deploy-preview-X--your-site.netlify.app` |

---

## Testing Before Deploy

### Local Production Build

Test the production build locally:

```bash
# Build
npm run build:webapp

# Serve locally (install if needed)
npx serve packages/ganttlab-adapter-webapp/dist
```

Open http://localhost:3000

---

## Security Checklist

Already configured in `netlify.toml`:
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ X-XSS-Protection: enabled
- ✅ Referrer-Policy: strict-origin-when-cross-origin

### Additional Security (Optional)

Add Content Security Policy:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
```

> **Warning**: This may need adjustment based on external APIs you use.

---

## Cost

Netlify Free Tier includes:
- ✅ 100GB bandwidth/month
- ✅ 300 build minutes/month
- ✅ 1 concurrent build
- ✅ Unlimited sites

GanttLab is a static site, so it's **very cost-effective** on Netlify.

---

## Next Steps After Deploy

1. ✅ Test the deployed site
2. ✅ Verify tree hierarchy feature works
3. ✅ Test with your GitLab project
4. ✅ Set up custom domain (optional)
5. ✅ Configure analytics (Netlify Analytics or Google Analytics)

---

## Quick Commands Reference

```bash
# Local development (Node 22)
npm run dev

# Local development (Node 16)
npm run webapp

# Production build
npm run build:webapp

# Deploy to Netlify (after connecting repo)
git push origin main
```

---

## Support

- **Netlify Docs**: https://docs.netlify.com
- **Build Issues**: Check Netlify deploy logs
- **App Issues**: See `TREE_HIERARCHY_TESTING.md`

---

## Summary

Your GanttLab project is **already optimized for Netlify**! Just:

1. Push to Git
2. Connect to Netlify
3. Deploy! 🚀

No additional configuration needed. The tree hierarchy feature will work perfectly on Netlify.

