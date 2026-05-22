# E-mongolla Mobile App

A mobile-only Next.js application for creating and customizing ID cards.

## Features

- Mobile-only app (desktop access blocked)
- Customizable ID cards with text fields and image uploads
- Card carousel on profile page
- No backend required — fill the form and data saves in browser localStorage
- Persistent data storage with localStorage
- PWA support with homescreen installation
- Responsive design for small screens (≤370px)

## Getting Started

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Build for Production

```bash
npm run build
npm start
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub/GitLab/Bitbucket
2. Import your repository on [Vercel](https://vercel.com)
3. Vercel will automatically detect Next.js and deploy
4. Your app will be live at `your-project.vercel.app`

### Other Platforms

The app is configured with `output: 'standalone'` which works well for:
- Docker deployments
- Self-hosted servers
- Cloud platforms (AWS, GCP, Azure, etc.)

#### Docker Deployment

1. Build the app:
```bash
npm run build
```

2. Create a Dockerfile:
```dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=base /app/public ./public
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

3. Build and run:
```bash
docker build -t e-mongolla .
docker run -p 3000:3000 e-mongolla
```

## Requirements

- Node.js 18+
- npm/yarn/pnpm
- No database or API keys needed

## Project Structure

- `/app` - Next.js app directory
- `/app/components` - React components (App, FooterNav)
- `/public` - Static assets (images, manifest.json)
- `/public/logo.jpg` - App icon for PWA

## Notes

- App only works on mobile devices (≤768px width with touch support)
- All images are unoptimized for faster loading
- Data persists in browser localStorage
- PWA manifest configured for homescreen installation
