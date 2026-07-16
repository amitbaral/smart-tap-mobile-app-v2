import { supabase } from "@/lib/supabase";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ChevronRight,
  LogOut,
  Search,
  Shield,
  User,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Role = "user" | "social" | "admin" | "super_admin";

interface UserSummary {
  user_id: string;
  first_name: string;
  last_name: string;
  email_address: string;
  avatar_url: string | null;
  profile_count: number;
  role: Role;
}

const ROLE_CONFIG: Record<
  Role,
  { label: string; bg: string; border: string; text: string }
> = {
  super_admin: {
    label: "Super Admin",
    bg: "#2a1500",
    border: "#7a3a00",
    text: "#FF9500",
  },
  admin: { label: "Admin", bg: "#001428", border: "#003a7a", text: "#007AFF" },
  social: {
    label: "Social",
    bg: "#001a0f",
    border: "#007a3a",
    text: "#34C759",
  },
  user: { label: "User", bg: "#1a1a1a", border: "#3a3a3c", text: "#8e8e93" },
};

function RoleBadge({ role }: { role: Role }) {
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.user;
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: cfg.bg, borderColor: cfg.border },
      ]}
    >
      <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

const PAGE_SIZE = 10;

export default function AdminDashboard() {
  const router = useRouter();
  const [allUsers, setAllUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [search, setSearch] = useState("");

  const fetchAllUsers = async () => {
    try {
      setLoading(true);

      const [profilesRes, rolesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, first_name, last_name, email_address, avatar_url")
          .order("created_at", { ascending: false }),
        supabase.from("roles").select("user_id, role"),
      ]);

      if (profilesRes.error) throw profilesRes.error;

      // Build role lookup map
      const roleMap = new Map<string, Role>();
      for (const r of rolesRes.data || []) {
        roleMap.set(r.user_id, r.role as Role);
      }

      // Deduplicate profiles by user_id; count profiles per user
      const userMap = new Map<string, UserSummary>();
      for (const p of profilesRes.data || []) {
        if (userMap.has(p.user_id)) {
          userMap.get(p.user_id)!.profile_count += 1;
        } else {
          userMap.set(p.user_id, {
            user_id: p.user_id,
            first_name: p.first_name,
            last_name: p.last_name,
            email_address: p.email_address,
            avatar_url: p.avatar_url,
            profile_count: 1,
            role: roleMap.get(p.user_id) ?? "user",
          });
        }
      }
      setAllUsers(Array.from(userMap.values()));
    } catch (error: any) {
      console.error("Error fetching users:", error);
      Alert.alert("Error", "Failed to load users.");
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
        u.first_name.toLowerCase().includes(q) ||
        u.last_name.toLowerCase().includes(q) ||
        u.email_address.toLowerCase().includes(q),
    );
  }, [allUsers, search]);

  const displayedUsers = filteredUsers.slice(0, displayCount);
  const hasMore = displayCount < filteredUsers.length;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleLoadMore = () => {
    setDisplayCount((c) => c + PAGE_SIZE);
  };

  const handleUserPress = (userId: string) => {
    router.push({
      pathname: "/admin/user/[id]",
      params: { id: userId },
    } as any);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#1a1a1a", "#0a0a0a"]}
        style={styles.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.adminBadge}>
            <Shield size={14} color="#007AFF" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              {allUsers.length} user{allUsers.length !== 1 ? "s" : ""}{" "}
              registered
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <LogOut size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Search size={18} color="#8e8e93" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email…"
          placeholderTextColor="#8e8e93"
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            setDisplayCount(PAGE_SIZE);
          }}
          clearButtonMode="while-editing"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {/* User list */}
      <FlatList
        data={displayedUsers}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <User size={48} color="#444" />
            <Text style={styles.emptyTitle}>
              {search ? "No users found" : "No users yet"}
            </Text>
            <Text style={styles.emptyText}>
              {search
                ? "Try a different search term"
                : "No users have registered yet"}
            </Text>
          </View>
        }
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={handleLoadMore}
              activeOpacity={0.75}
            >
              <Text style={styles.loadMoreText}>
                Load more · {filteredUsers.length - displayCount} remaining
              </Text>
            </TouchableOpacity>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.82}
            style={styles.userRow}
            onPress={() => handleUserPress(item.user_id)}
          >
            <View style={styles.avatarContainer}>
              {item.avatar_url ? (
                <Image
                  source={{ uri: item.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <User size={22} color="#8e8e93" />
                </View>
              )}
            </View>
            <View style={styles.userInfo}>
              <View style={styles.userNameRow}>
                <Text style={styles.userName}>
                  {item.first_name} {item.last_name}
                </Text>
                <RoleBadge role={item.role} />
              </View>
              <Text style={styles.userEmail} numberOfLines={1}>
                {item.email_address}
              </Text>
              <Text style={styles.profileCount}>
                {item.profile_count} profile
                {item.profile_count !== 1 ? "s" : ""}
              </Text>
            </View>
            <ChevronRight size={18} color="#48484a" />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  background: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "100%",
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    color: "#8e8e93",
    marginTop: 15,
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginTop: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  adminBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#0a1628",
    borderWidth: 1,
    borderColor: "#1a3a5c",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#8e8e93",
    marginTop: 2,
  },
  signOutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1c1c1e",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1c1c1e",
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#3a3a3c",
    height: 48,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1c1c1e",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3a3a3c",
    overflow: "hidden",
    marginRight: 14,
    borderWidth: 1,
    borderColor: "#48484a",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 3,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  badge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  userEmail: {
    fontSize: 13,
    color: "#8e8e93",
    marginBottom: 3,
  },
  profileCount: {
    fontSize: 12,
    color: "#48484a",
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 70,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: "#8e8e93",
    textAlign: "center",
  },
  loadMoreButton: {
    alignItems: "center",
    padding: 16,
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: "#1c1c1e",
    borderWidth: 1,
    borderColor: "#3a3a3c",
  },
  loadMoreText: {
    color: "#007AFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
