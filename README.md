# Grabbit: The Geofence Shopping Assistant

Grabbit is a mobile application designed to help users remember their shopping list items by leveraging native geofencing capabilities. The app allows users to create a list of items they need to purchase and associate them with types of stores (e.g., grocery, pharmacy, hardware). When the user enters a predefined radius of a relevant store, the app will trigger a native notification to remind them of the items they can buy there.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.io/installation)
- [Expo Orbit](https://expo.dev/orbit) for running on-device (optional but recommended if you're on a Mac):
  ```bash
  brew install expo-orbit
  ```

### Installation & Setup

1.  **Install dependencies:**
    This project uses `pnpm` as the package manager.

    ```bash
    pnpm install
    ```

2.  **Log in to Expo Application Services (EAS):**
    We use EAS for managing environment variables and builds. You can access the `eas-cli` via the `pnpm eas` helper script.

    ```bash
    pnpm eas login
    ```

3.  **Pull environment variables:**
    This will pull the required environment variables for the `development` environment.

    ```bash
    pnpm pull-env
    ```

### Running the App

- **On an iOS or Android simulator:**

  ```bash
  pnpm ios
  # or
  pnpm android
  ```

- **On a physical device:**
  Use the `-d` flag and we recommend using [Expo Orbit](https://expo.dev/orbit) to streamline the process.

  ```bash
  pnpm ios -d
  # or
  pnpm android -d
  ```

### Testing

Unit tests are in `__tests__` and can be run with `pnpm test`. We're also experimenting with Maestro. To install it for E2E tests:

```bash
curl -L https://get.maestro.mobile.dev | bash
```

## Technology Stack

- **Mobile Framework:** Expo (React Native)
- **Package Manager:** pnpm
- **Database:** SQLite with Drizzle ORM
- **AI Classification:** `react-native-executorch` for on-device inference.
- **Geolocation:** `expo-location` with native geofencing via `expo-task-manager`.
- **Maps:** MapBox for finding nearby store locations.

## Development Commands

- **Start development server:** `pnpm start`
- **Run linter:** `pnpm lint`
- **Generate database migrations:** `pnpm drizzle-kit generate` (after changes to `db/schema.ts`)

To learn more about developing your project with Expo, look at the [Expo documentation](https://docs.expo.dev/).
