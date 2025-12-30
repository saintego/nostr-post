# NostrPost Next.js Demo

This is a demo application showing how to use `@nostr-post/react` components in a Next.js app with the App Router.

## Features

- **NostrPostComposer**: Create and publish Nostr posts with success notifications
- **NostrPostFeed**: Display a feed of Nostr events
- **NostrPostView**: Display individual Nostr events
- **useNostrAuth**: Complete authentication hook with login/logout and loading states
- Login with Nostr extension
- Automatic post publishing with feedback
- Responsive design with consistent theming

## Getting Started

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Run the development server:

   ```bash
   pnpm dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

4. Install a Nostr extension (like nos2x or Alby) and login to start posting!

## Usage

The demo shows a complete Nostr posting interface:

1. Click "Login with Nostr" to connect your Nostr extension
2. Use the composer to write and publish posts (with success notifications)
3. View your posts in the "Your Posts" feed below
4. Use the logout button to disconnect

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
