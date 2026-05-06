# Debrief App - Deployment Guide

## Production URL
- **Primary:** https://debrief-training.vercel.app
- **Alias:** debrief-bjj.vercel.app (legacy, do not use)

## Vercel Project Configuration
- **Project Name:** debrief
- **Project ID:** `prj_gMO0OdteiinsrfDkhbmDx7hLFOQr`
- **Organization:** bigmikeginns-projects
- **Team ID:** bigmikeginns-projects

## Setup Instructions
When setting up a new environment, ensure `.vercel/project.json` contains:
```json
{
  "projectId": "prj_gMO0OdteiinsrfDkhbmDx7hLFOQr",
  "orgId": "bigmikeginns-projects"
}
```

Note: `.vercel/` is in `.gitignore` and not tracked in git. Manual creation is required on new setups.

## Deployment Commands
```bash
# Deploy to production (debrief-training.vercel.app)
vercel --prod --yes

# Preview deployment
vercel deploy
```

## Asset Versioning
- Versioned assets are built via `build.sh`
- Manifest file: `deploy-manifest.json` (not cached, always fresh)
- Asset loading: `load-assets.js` injects versioned bundles at runtime
- Files are hashed with MD5 (e.g., `debrief-viewer.16458657.js`)

## Note on Multiple URLs
To prevent confusion:
- Only debrief-training.vercel.app is the official production URL
- The debrief project in Vercel has been aliased to debrief-training.vercel.app
- Do not deploy to separate projects unless explicitly intended
- All deployments should target the "debrief" project
