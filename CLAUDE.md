# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Start development server:**
```bash
pnpm start
# or for specific platforms:
pnpm android    # Run on Android
pnpm ios        # Run on iOS  
pnpm web        # Run on web
```

**Database operations:**
```bash
pnpm drizzle-kit generate    # Generate new migrations after schema changes
pnpm drizzle-kit migrate     # Apply migrations to database
```

**Code quality:**
```bash
pnpm lint       # Run ESLint
```

**Reset project:**
```bash
pnpm reset-project    # Move starter code to app-example and create blank app directory
```

## Architecture Overview

**Grabbit** is a React Native/Expo mobile app that provides geofence-based shopping reminders. Users can create shopping lists and receive notifications when near relevant stores.

### Core Technologies
- **Framework:** Expo with React Native (file-based routing via expo-router)
- **Database:** SQLite with Drizzle ORM
- **Package Manager:** pnpm
- **AI Classification:** react-native-executorch with MULTI_QA_MINILM_L6_COS_V1 embeddings
- **Geolocation:** expo-location with native geofencing
- **Speech Recognition:** expo-speech-recognition
- **Maps:** MapBox for store location discovery

### Key Architectural Components

**Database Layer (`db/`):**
- `schema.ts` defines tables: `settings`, `shoppingItems`, `locations`
- Drizzle ORM configuration in `drizzle.config.ts`
- Database context provided in `app/_layout.tsx` with automatic migrations

**Hooks (`hooks/`):**
- `useShoppingList`: CRUD operations for shopping items with database persistence
- `useShoppingClassifier`: AI-powered item categorization using embeddings
- `useTracking`: Location tracking and geofence management
- `useSpeechRecognition`: Voice input for adding items
- `useStoreManager`: Store location management

**Main App Structure:**
- `app/_layout.tsx`: Root layout with database provider, navigation stack
- `app/index.tsx`: Main shopping list interface with speech recognition
- `app/settings.tsx`: App configuration screen
- `components/`: Reusable UI components for shopping list items and header

**AI Classification System:**
- Uses `react-native-executorch` for on-device inference
- Classifies shopping items into categories (grocery, pharmacy, hardware, etc.)
- Combines keyword matching with semantic embeddings for accuracy

**Geofencing:**
- Native TaskManager integration for background location monitoring
- Triggers notifications when entering store geofences
- Proximity-based UI highlighting of nearby store items

## Development Guidelines

**Database Schema Changes:**
1. Modify `db/schema.ts`
2. Run `pnpm drizzle-kit generate` to create migration
3. New migration files appear in `drizzle/` directory
4. Migrations run automatically on app start

**Adding New Store Categories:**
- Update store type definitions in `data/stores.ts`
- Modify classification logic in `useShoppingClassifier.ts`
- Update category vectors if needed via `generate_category_vectors.py`

**Speech Recognition Integration:**
- Uses expo-speech-recognition for voice input
- Supports natural language parsing with "and" keyword detection
- Real-time item updates during speech input

**Location Services:**
- Requires location permissions for geofencing functionality
- Background task `GEOFENCE_TASK` handles store proximity notifications
- Store locations managed via MapBox integration