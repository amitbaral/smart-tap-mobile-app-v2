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

export type UserRole = "user" | "social" | "admin" | "super_admin";

const ADMIN_ROLES: UserRole[] = ["super_admin"];

async function fetchRole(session: Session): Promise<UserRole> {
  // Match web app resolution: app_metadata.role → user_metadata.role → roles table → 'user'
  const appRole = session.user.app_metadata?.role as UserRole | undefined;
  if (appRole) return appRole;

  const userMetaRole = session.user.user_metadata?.role as UserRole | undefined;
  if (userMetaRole) return userMetaRole;

  const { data } = await supabase
    .from("roles")
    .select("role")
    .eq("user_id", session.user.id)
    .single();
  return (data?.role as UserRole) ?? "user";
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Initial session + role load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        const role = await fetchRole(session);
        setUserRole(role);
      }
      setInitialized(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        const role = await fetchRole(session);
        setUserRole(role);
      } else {
        setUserRole(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const isLoginPage = (segments[0] as string) === "login";
    const isAdminPage = (segments[0] as string) === "admin";
    const isAdmin = userRole !== null && ADMIN_ROLES.includes(userRole);

    console.log("Auth check:", {
      session: !!session,
      role: userRole,
      isAdmin,
      segments,
    });

    if (!session && !isLoginPage) {
      router.replace("/login");
    } else if (session && isLoginPage) {
      router.replace({ pathname: isAdmin ? ("/admin" as any) : "/" });
    } else if (session && isAdmin && !isAdminPage) {
      router.replace({ pathname: "/admin" as any });
    } else if (session && !isAdmin && isAdminPage) {
      router.replace("/");
    }
  }, [session, userRole, initialized, segments]);

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#111111" },
          headerTintColor: "#ffffff",
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: "#0a0a0a" },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="admin/index" />
        <Stack.Screen name="admin/user/[id]" />
        <Stack.Screen name="admin/user/edit-profile/[profileId]" />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
