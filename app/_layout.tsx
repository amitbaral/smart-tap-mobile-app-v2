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

const ADMIN_ROLES: UserRole[] = ["admin", "super_admin"];

async function fetchRole(userId: string): Promise<UserRole> {
  const { data } = await supabase
    .from("roles")
    .select("role")
    .eq("user_id", userId)
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
        const role = await fetchRole(session.user.id);
        setUserRole(role);
      }
      setInitialized(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        const role = await fetchRole(session.user.id);
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
    })

    if (!session && !isLoginPage) {
      u
    } else if (session && isLoginPage) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace({ pathname: isAdmin ? ("/admin" as any) : "/" });
    } else if (session && isAdmin && !isAdminPage) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace({ pathname: "/admin" as any });
    } else if (session && !isAdmin && isAdminPage) {
      router.replace("/");
    }
  }, [session, userRole, initialized, segments]);

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="admin/index" />
        <Stack.Screen name="admin/user/[id]" />
        <Stack.Screen name="admin/user/edit-profile/[profileId]" />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
