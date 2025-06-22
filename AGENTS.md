# Grabbit: The Geofence Shopping Assistant

## Purpose

Grabbit is a mobile application designed to help users remember their shopping list items by leveraging native geofencing capabilities. The app will allow users to create a list of items they need to purchase and associate them with types of stores (e.g., grocery, pharmacy, hardware). When the user enters a predefined radius of a relevant store, the app will trigger a native notification to remind them of the items they can buy there.

This project will evolve the initial web-based prototype into a performant, cross-platform mobile application for both iOS and Android.

## Technology Stack & Preferences

- **Mobile Framework:** We use Expo for multi-platform mobile development toolkit to build the application. Whenver possible we use an official Expo plugin from https://docs.expo.dev/versions/latest
- **Package Manager:** `pnpm` will be used for all dependency management. It is efficient with disk space and provides fast installation times.
- **Native Integration:** A key requirement is to tap into native geofencing APIs on both iOS and Android. This will allow the app to provide timely and battery-efficient alerts, even when running in the background.
- **Persistence** `drizzle` is used for interacting with SQLite, a provider exists along with a useDb hook. If changes are made to db/schema.ts you must run `pnpm drizzle-kit generate` to generate new migrations.
- **AI** `react-native-executorch` is used for performant inference. `useShoppingClassifier` makes use of MULTI_QA_MINILM_L6_COS_V1 to generate embeddings and find similar ones to classify shopping items into our taxonomy.
- **Mapping** MapBox is used to find nearby locations for the different categories a user might be able to find items at.
