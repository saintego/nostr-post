# NostrPost Next.js Demo

This is a demo application showing how to use `@nostr-post/react` components in a Next.js app with the App Router.

## Features

- **NostrPostComposer**: Create and publish Nostr posts with success notifications
- **NostrPostFeed**: Display a feed of Nostr events
- **NostrPostView**: Display individual Nostr events
- **useNostrAuth**: Authentication state hook with loading states
- Login/Logout buttons driven by `NostrBridge.login()` / `NostrBridge.logout()`
- Sign-in with [nostr-shard-signer](https://github.com/saintego/nostr-shard-signer)
- Automatic post publishing with feedback
- Responsive design with consistent theming

## Getting Started

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Run the development server:

   ```bash
   pnpm dev   # optional: NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=<your client id> pnpm dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

4. Click "Login with Nostr" (NIP-07 extension, NIP-46 bunker, or Google/Apple/X with a client ID) to start posting!

User sign-in uses [nostr-shard-signer](https://github.com/saintego/nostr-shard-signer).
Without a client ID it offers Nostr-only sign-in (NIP-07 extension or NIP-46 bunker such as Amber).
We recommend setting `NEXT_PUBLIC_WEB3AUTH_CLIENT_ID` to a Web3Auth client ID: it adds Google/Apple/X sign-in, so people
without a Nostr key can start too. Register it for your origin in the
[portal](https://saintego.github.io/nostr-shard-signer/portal/) (localhost cannot be registered).


## Usage

The demo shows a complete Nostr posting interface:

1. Click "Login with Nostr" to open the nostr-shard-signer sign-in
2. Use the composer to write and publish posts (with success notifications)
3. View your posts in the "Your Posts" feed below
4. Use the Logout button to sign out

## Components Used

- `useNostrAuth`: Authentication hook providing login/logout functionality
- `NostrPostComposer`: For creating posts with publish callbacks
- `NostrPostFeed`: For displaying a list of posts filtered by author
- `NostrPostView`: Automatically used within the feed to display individual posts

## Configuration

The feed is configured to show:

- Posts from the logged-in user (`authors={[pubkey]}`)
- Kind 1 events (text posts)
- Limited to 20 posts

You can customize these filters as needed for your application.
