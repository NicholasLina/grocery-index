# Canadian Grocery Index - Frontend

The frontend application for the Canadian Grocery Index, built with Next.js 15 and React 19.

## Overview

This is a Next.js application that provides an interactive interface for exploring Canadian grocery price trends. It displays price changes, trends, streaks, and allows users to search for specific products.

## Features

- **Homepage Dashboard**: View top gainers, losers, and price streaks
- **Product Search**: Search and explore individual product price histories
- **Interactive Charts**: Visualize price trends with Recharts
- **Progressive Loading**: Optimized loading experience
- **Responsive Design**: Works on desktop and mobile devices
- **Service Worker**: Offline support and caching

## Tech Stack

- **Next.js 15.4** - React framework with App Router
- **React 19** - UI library
- **Tailwind CSS** - Utility-first CSS framework
- **Recharts** - Charting library for React
- **ESLint** - Code linting

## Getting Started

### Prerequisites

- Node.js >= 18.0.0 (and < 21.0.0)
- npm >= 8.0.0

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3000/api/statcan
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5000](http://localhost:5000) in your browser.

## Available Scripts

- `npm run dev` - Start development server on port 5000 with Turbopack
- `npm run build` - Build the application for production
- `npm start` - Start production server on port 5000
- `npm run lint` - Run ESLint to check code quality

## Project Structure

```
react-frontend/
├── app/                    # Next.js App Router
│   ├── layout.js          # Root layout component
│   ├── page.js            # Homepage
│   └── product/           # Product detail pages
│       └── [slug]/
│           └── page.js
├── components/            # React components
│   ├── Header.js         # Navigation header
│   ├── HomePage.js       # Main homepage component
│   ├── ProductPage.js    # Product detail page
│   ├── PriceCard.js      # Price change card
│   ├── PriceChart.js     # Price trend chart
│   ├── StreakCard.js     # Price streak card
│   └── ...
├── lib/                   # Utility functions
│   ├── api.js            # API client
│   ├── products.js       # Product utilities
│   └── slugUtils.js      # URL slug utilities
└── public/               # Static assets
```

## Environment Variables

- `NEXT_PUBLIC_API_URL` - Base URL for the backend API (default: `http://localhost:3000/api/statcan`)

## Deployment

This application is optimized for deployment on Vercel. Simply connect your repository and Vercel will automatically detect Next.js and configure the deployment.

For other platforms, build the application:
```bash
npm run build
npm start
```

## Performance Optimizations

- Static generation with revalidation (24-hour cache)
- Image optimization enabled
- Code splitting and lazy loading
- Service worker for offline support
- Progressive loading for better UX

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
