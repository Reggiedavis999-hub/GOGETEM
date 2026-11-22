# Dashin & Flexin

Native iPhone + Android app (Expo SDK 58, React Native, Expo Router, TypeScript) for Amazon Flex, DoorDash and Uber Eats: earnings, live dash timer, drop logger, schedule, mileage write-off, expenses, CSV export.

Every user gets a private account (email + password). Accounts, sign-in, password reset (emailed code or recovery code), change password and account deletion are handled by the Dashin & Flexin API (`https://dashin-flexin-api.vercel.app/api/hq`). The sign-in token is kept in the phone's secure storage. Last-synced data is cached for offline viewing.

## First run

```bash
npm install
npm run setup        # npx expo install --fix  (pins every Expo package to SDK 58)
npm run test:logic   # money / time / mileage / CSV checks
npx expo start       # scan the QR with Expo Go
```

## Build the real app (EAS)

```bash
npm i -g eas-cli
eas login
eas init                              # creates the Expo project, writes projectId into app.json
eas build -p android --profile preview      # installable .apk
eas build -p ios --profile production       # needs Apple Developer account ($99/yr)
eas submit -p ios                            # to TestFlight / App Store
```

Bundle ID / package: `com.rhondasons.dashinandflexin`. To change it, edit `app.json`.

## Layout

- `src/lib/calc.ts` all math and parsing (tested), `src/lib/api.ts` backend client with a single write queue, `src/lib/store.tsx` app state
- `src/app/(tabs)` Home, Schedule, Drops, Money; `src/app/*.tsx` entry forms and settings
