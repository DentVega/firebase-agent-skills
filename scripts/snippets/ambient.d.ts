// Ambient declarations for identifiers commonly referenced inside SKILL.md
// code samples without being defined in the snippet itself. This lets us
// compile-check snippets that focus on the API call of interest without
// having to wrap each one in scaffolding.
//
// Add new globals here as needed when adopting `// @verify` on more snippets.

declare const uid: string;
declare const email: string;
declare const password: string;
declare const title: string;
declare const body: string;
declare const file: File;
declare const localFileUri: string;
declare const roomId: string;
declare const postId: string;
declare const sinceTs: number;
declare const msgId: string;
declare const userFcmToken: string;
declare const userId: string;
declare const draft: string;
declare const setUser: (u: unknown) => void;
declare const setPosts: (p: unknown[]) => void;
declare const setMessages: (m: unknown[]) => void;
declare const setProgress: (n: number) => void;
declare const setValue: (v: unknown) => void;
declare const setLoading: (b: boolean) => void;
declare const router: { push: (path: string) => void };
declare const dispatch: (name: string, args: Record<string, unknown>) => Promise<unknown>;
declare const handlePost: (snap: unknown) => void;
declare const handleAll: (docs: unknown[]) => void;
declare const handleMessage: (msg: unknown) => Promise<void>;
declare const handler: (...args: unknown[]) => Promise<unknown>;
declare const renderToString: (path: string) => Promise<string>;

// React Native globals
declare const __DEV__: boolean;

// React Hooks shorthand — some samples elide the `import { useEffect } from "react"`.
// In a real file the import would be there; here we declare to keep snippets focused.
declare function useEffect(cb: () => void | (() => void), deps?: unknown[]): void;
declare function useState<T>(initial: T | (() => T)): [T, (v: T) => void];

// Common ambient namespace for @react-native-firebase/* submodules. Real type
// checking against the Firebase APIs comes from the `firebase` npm package
// (web SDK types); the RN modules are stubbed to `any` for now to avoid
// pulling in their native peer dependencies.
declare module "@react-native-firebase/app" { const x: any; export default x; export const firebase: any; }
declare module "@react-native-firebase/auth" { const x: any; export default x; }
declare module "@react-native-firebase/firestore" {
  const x: any; export default x;
  export type FirebaseFirestoreTypes = any;
}
declare module "@react-native-firebase/functions" { const x: any; export default x; }
declare module "@react-native-firebase/storage" { const x: any; export default x; }
declare module "@react-native-firebase/database" { const x: any; export default x; }
declare module "@react-native-firebase/messaging" { const x: any; export default x; }
declare module "@react-native-firebase/crashlytics" { const x: any; export default x; }
declare module "@react-native-firebase/analytics" { const x: any; export default x; }
declare module "@react-native-firebase/app-check" { const x: any; export default x; }
declare module "@react-native-firebase/remote-config" { const x: any; export default x; }
declare module "@react-native-firebase/vertexai" {
  export function getVertexAI(app?: unknown): unknown;
  export function getGenerativeModel(vertexAI: unknown, opts: { model: string }): {
    generateContent(input: string | unknown[]): Promise<{ response: { text(): string } }>;
  };
}
declare module "@react-native-google-signin/google-signin" {
  export const GoogleSignin: {
    configure: (opts: { webClientId: string }) => void;
    signIn: () => Promise<{ data: { idToken: string | null } | null }>;
  };
}
