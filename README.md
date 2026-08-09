# TNT Hopper Protect Website

Official-style Node.js website for TNT Hopper Protect by NodeDistro MC Plugins.

## Includes

- Main landing page
- Wiki/documentation page
- Issue tracker with a working submission form
- JSON file storage for submitted issues
- Responsive design

## Run locally

```bash
npm install
npm start
```

Then open `http://localhost:3000`.

## Production

Set the `PORT` environment variable if your host requires one. The issue tracker currently stores reports in `data/issues.json`, which is suitable for a small/self-hosted deployment. For serverless hosts or multiple instances, replace the JSON storage layer with a persistent database.
