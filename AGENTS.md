# Grabbit: The Geofence Shopping Assistant

## Purpose

Grabbit is a mobile application designed to help users remember their shopping list items by leveraging native geofencing capabilities. The app will allow users to create a list of items they need to purchase and associate them with types of stores (e.g., grocery, pharmacy, hardware). When the user enters a predefined radius of a relevant store, the app will trigger a native notification to remind them of the items they can buy there.

This project will evolve the initial web-based prototype into a performant, cross-platform mobile application for both iOS and Android.

## Technology Stack & Preferences

- **Mobile Framework:** We use Expo for multi-platform mobile development toolkit to build the application.  Whenver possible we use an official Expo plugin from https://docs.expo.dev/versions/latest
- **Package Manager:** `pnpm` will be used for all dependency management. It is efficient with disk space and provides fast installation times.
- **Native Integration:** A key requirement is to tap into native geofencing APIs on both iOS and Android. This will allow the app to provide timely and battery-efficient alerts, even when running in the background.