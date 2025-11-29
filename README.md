# Mood Spark - Mood Tracking Application

A mood tracking application built with Next.js, TypeScript, React, shadcn-ui, and Tailwind CSS.

## Getting Started

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd mood-spark-12-main

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:3000`

## Technologies Used

This project is built with:

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **React 19** - UI library
- **shadcn-ui** - Re-usable component library
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - State management
- **TanStack Query** - Data fetching and caching

## Available Scripts

```sh
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Project Structure

```
mood-spark-12-main/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── actions/           # Server actions
│   └── (pages)/           # App pages
├── src/
│   ├── components/        # React components
│   ├── lib/              # Utilities and services
│   └── hooks/            # Custom React hooks
└── public/               # Static assets
```

## Features

- Mood tracking and logging
- Emotion insights and analytics
- Privacy-focused settings
- Responsive design
- Dark mode support

## Seed 30 Days of Dummy Data

Choose a target user by Auth UUID or by email.

Add this to env file
$env:SEED_EMAIL="test@example.com"   # or: $env:SEED_USER_ID="<auth-uuid>"

Then Run
npx tsx scripts/seed_dummy_daily_features.ts


## Train the Model

npx tsx scripts/train_model.ts

You should see a JSON line:

{ "model_version": "v2025...", "train_rows": 30, "train_mae": 0.xx }

This writes to model_registry, model_feature_importance, and model_predictions.

## Run the App

npm run dev

Open http://localhost:3000 
