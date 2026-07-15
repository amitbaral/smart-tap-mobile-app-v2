import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import {
    DarkTheme,
    Stack,
    ThemeProvider,
    useRouter,
    useSegments,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const isLoginPage = segments[0] === "login";
    console.log("Auth check:", { session: !!session, isLoginPage, segments });

    if (!session && !isLoginPage) {
      // Redirect to login if not authenticated
      router.replace("/login");
    } else if (session && isLoginPage) {
      // Redirect to home if authenticated
      router.replace("/");
    }
  }, [session, initialized, segments]);

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ title: "Home" }} />
        <Stack.Screen name="login" options={{ title: "Login" }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
