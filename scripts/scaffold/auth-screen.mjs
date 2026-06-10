#!/usr/bin/env node
/**
 * Scaffold an Expo Router (auth)/sign-in.tsx with email/password + Google
 * sign-in. Mirrors the pattern recommended by the firebase-auth skill.
 *
 *   node scripts/scaffold/auth-screen.mjs --out app/\(auth\)/sign-in.tsx
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    out:   { type: "string", short: "o" },
    force: { type: "boolean", default: false },
    help:  { type: "boolean", default: false },
  },
  strict: false,
});

if (values.help || !values.out) {
  console.log(`Usage: auth-screen.mjs --out <path> [--force]

Writes an Expo Router sign-in screen with email/password + Google providers,
using @react-native-firebase/auth and @react-native-google-signin/google-signin.

Required:
  --out <path>   Output file (e.g. app/(auth)/sign-in.tsx)

Optional:
  --force        Overwrite if the file already exists
`);
  process.exit(values.help ? 0 : 1);
}

const TEMPLATE = `import { useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";
import auth from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

GoogleSignin.configure({
  // Web OAuth client ID auto-created by \`firebase deploy --only auth\`.
  // Find in Google Cloud Console → APIs & Services → Credentials.
  webClientId: "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com",
});

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    if (!email || !password) return;
    setLoading(true);
    try {
      await auth().signInWithEmailAndPassword(email, password);
    } catch (e: any) {
      Alert.alert("Sign-in failed", e.message);
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setLoading(true);
    try {
      const { data } = await GoogleSignin.signIn();
      if (!data?.idToken) throw new Error("No ID token returned");
      const credential = auth.GoogleAuthProvider.credential(data.idToken);
      await auth().signInWithCredential(credential);
    } catch (e: any) {
      Alert.alert("Google sign-in failed", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title="Sign in" onPress={signInWithEmail} disabled={loading} />

      <View style={{ height: 16 }} />

      <Button title="Continue with Google" onPress={signInWithGoogle} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title:     { fontSize: 28, fontWeight: "600", marginBottom: 16 },
  input:     { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
});
`;

if (existsSync(values.out) && !values.force) {
  console.error(`✗ ${values.out} already exists. Pass --force to overwrite.`);
  process.exit(1);
}

mkdirSync(dirname(values.out), { recursive: true });
writeFileSync(values.out, TEMPLATE);
console.log(`✓ wrote ${values.out}`);
console.log(`
Next steps:
  1. Replace YOUR_WEB_CLIENT_ID with the value from Google Cloud Console
     (APIs & Services → Credentials → the Web OAuth client).
  2. If you don't have one yet, run:
       npx -y firebase-tools@latest deploy --only auth
     to auto-create OAuth clients for your registered apps.
  3. Make sure @react-native-google-signin/google-signin is in your
     Expo plugins array (see firebase-auth references/react-native.md).
`);
