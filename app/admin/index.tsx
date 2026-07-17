import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { ChevronRight, LogOut, Shield, User } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

type Role = "user" | "social" | "admin" | "super_admin";

const ROLE_CONFIG: Record<Role, { label: string; bg: string; text: string }> = {
  super_admin: {
    label: "Super Admin",
    bg: "rgba(255,149,0,0.15)",
    text: "#FF9500",
  },
  admin: { label: "Admin", bg: "rgba(0,122,255,0.15)", text: "#007AFF" },
  social: { label: "Social", bg: "rgba(52,199,89,0.15)", text: "#34C759" },
  user: { label: "User", bg: "rgba(142,142,147,0.15)", text: "#8e8e93" },
};

interface UserSummary {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  role: Role;
  profile_count: number;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

const PAGE_SIZE = 10;

function RoleBadge({ role }: { role: Role }) {
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.user;
  return (
    <View
      style={{
        backgroundColor: cfg.bg,
        borderRadius: 6,
        borderCurve: "continuous",
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}
    >
      <Text style={{ color: cfg.text, fontSize: 11, fontWeight: "600" }}>
        {cfg.label}
      </Text>
    </View>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [allUsers, setAllUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [search, setSearch] = useState("");

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_admin_users");
      if (error) throw error;
      setAllUsers(
        (data || []).map((u: any) => ({
          user_id: u.user_id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          role: (u.role ?? "user") as Role,
          profile_count: Number(u.profile_count ?? 0),
          first_name: u.first_name ?? null,
          last_name: u.last_name ?? null,
          avatar_url: u.avatar_url ?? null,
        })),
      );
    } catch (err: any) {
      console.error("get_admin_users error:", err);
      Alert.alert("Error", err?.message ?? "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return allUsers;
    const q = search.toLowerCase();
    return allUsers.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.first_name ?? "").toLowerCase().includes(q) ||
        (u.last_name ?? "").toLowerCase().includes(q),
    );
  }, [allUsers, search]);

  const displayedUsers = filteredUsers.slice(0, displayCount);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          justifyContent: "center",
          alignItems: "center",
          gap: 12,
        }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ color: colors.secondaryLabel, fontSize: 15 }}>
          Loading users…
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Admin",
          headerLargeTitle: true,
          headerLargeTitleStyle: { color: "#ffffff" },
          headerSearchBarOptions: {
            placeholder: "Search by name or email…",
            tintColor: colors.accent,
            textColor: "#ffffff",
            onChangeText: ({ nativeEvent: { text } }) => {
              setSearch(text);
              setDisplayCount(PAGE_SIZE);
            },
          },
          headerRight: () => (
            <TouchableOpacity
              onPress={() => supabase.auth.signOut()}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.card,
                justifyContent: "center",
                alignItems: "center",
              }}
              activeOpacity={0.7}
            >
              <LogOut size={18} color={colors.danger} />
            </TouchableOpacity>
          ),
        }}
      />
      <FlatList
        data={displayedUsers}
        keyExtractor={(item) => item.user_id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
        ListHeaderComponent={
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingBottom: 4,
            }}
          >
            <Shield size={16} color={colors.accent} />
            <Text style={{ color: colors.secondaryLabel, fontSize: 14 }}>
              {allUsers.length} user{allUsers.length !== 1 ? "s" : ""}{" "}
              registered
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 60, gap: 12 }}>
            <User size={48} color={colors.quaternaryLabel} />
            <Text
              style={{ fontSize: 17, fontWeight: "600", color: colors.label }}
            >
              {search ? "No results" : "No users yet"}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.secondaryLabel,
                textAlign: "center",
              }}
            >
              {search
                ? "Try a different search term"
                : "No users have registered yet"}
            </Text>
          </View>
        }
        ListFooterComponent={
          displayCount < filteredUsers.length ? (
            <TouchableOpacity
              style={{
                alignItems: "center",
                padding: 14,
                marginTop: 4,
                borderRadius: 14,
                borderCurve: "continuous",
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.cardBorder,
              }}
              onPress={() => setDisplayCount((c) => c + PAGE_SIZE)}
              activeOpacity={0.75}
            >
              <Text
                style={{
                  color: colors.accent,
                  fontSize: 15,
                  fontWeight: "600",
                }}
              >
                Load more · {filteredUsers.length - displayCount} remaining
              </Text>
            </TouchableOpacity>
          ) : null
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: "/admin/user/[id]",
                  params: { id: item.user_id },
                } as any)
              }
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                backgroundColor: colors.card,
                borderRadius: 14,
                borderCurve: "continuous",
                borderWidth: 1,
                borderColor: colors.cardBorder,
                padding: 14,
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}
            >
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor: colors.separator,
                  overflow: "hidden",
                }}
              >
                {item.avatar_url ? (
                  <Image
                    source={item.avatar_url}
                    style={{ width: 46, height: 46 }}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={{
                      flex: 1,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <User size={20} color={colors.secondaryLabel} />
                  </View>
                )}
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: colors.label,
                    }}
                  >
                    {item.first_name && item.last_name
                      ? `${item.first_name} ${item.last_name}`
                      : item.email}
                  </Text>
                </View>
                <Text
                  style={{ fontSize: 13, color: colors.secondaryLabel }}
                  numberOfLines={1}
                >
                  {item.email}
                </Text>
                <Text style={{ fontSize: 12, color: colors.tertiaryLabel }}>
                  {item.profile_count} profile
                  {item.profile_count !== 1 ? "s" : ""}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.tertiaryLabel} />
            </TouchableOpacity>
          </Animated.View>
        )}
      />
    </>
  );
}
