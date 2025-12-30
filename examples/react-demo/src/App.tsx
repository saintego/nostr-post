import {
    NostrPostComposer,
    NostrPostFeed,
    useNostrAuth,
} from "@nostr-post/react";

const styles = {
    container: {
        maxWidth: 600,
        margin: "0 auto",
        padding: 20,
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
    },
    title: {
        margin: 0,
        fontSize: 24,
    },
    loginBtn: {
        padding: "8px 16px",
        borderRadius: 8,
        border: "none",
        background: "#6366f1",
        color: "white",
        cursor: "pointer",
        fontSize: 14,
    },
    userInfo: {
        display: "flex",
        alignItems: "center",
        gap: 12,
    },
    pubkey: {
        fontSize: 12,
        opacity: 0.7,
        fontFamily: "monospace",
    },
    section: {
        marginTop: 32,
    },
    sectionTitle: {
        fontSize: 18,
        marginBottom: 16,
    },
};

export default function App() {
    const { pubkey, isLoggedIn, isLoading, login, logout } = useNostrAuth();

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h1 style={styles.title}>@nostr-post/react</h1>
                {isLoading ? (
                    <span>Loading...</span>
                ) : isLoggedIn ? (
                    <div style={styles.userInfo}>
                        <span style={styles.pubkey}>{pubkey?.slice(0, 12)}...</span>
                        <button style={styles.loginBtn} onClick={logout}>
                            Logout
                        </button>
                    </div>
                ) : (
                    <button style={styles.loginBtn} onClick={login}>
                        Login with Nostr
                    </button>
                )}
            </header>

            {/* Composer - works without manifest for simple Kind 1 notes */}
            <NostrPostComposer
                onPublished={(events) => {
                    console.log("Published events:", events);
                    alert(`Published ${events.length} event(s)!`);
                }}
            />

            {/* Feed - shows user's posts */}
            {pubkey && (
                <div style={styles.section}>
                    <h2 style={styles.sectionTitle}>Your Posts</h2>
                    <NostrPostFeed authors={[pubkey]} kinds={[1]} limit={10} />
                </div>
            )}
        </div>
    );
}
