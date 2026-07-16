import { nfcService } from "@/lib/nfc";
import { supabase } from "@/lib/supabase";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Building,
  CreditCard,
  Edit,
  IdCard,
  Mail,
  Radio,
  User,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Role = "user" | "social" | "admin" | "super_admin";

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

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  company_name: string | null;
  email_address: string;
  avatar_url: string | null;
}

export default function AdminUserProfiles() {
  const { id: userId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRole, setUserRole] = useState<Role>("user");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [writingId, setWritingId] = useState<string | null>(null);

  const fetchProfiles = async () => {
    if (!userId) return;
    try {
      const [profilesRes, roleRes] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, first_name, last_name, job_title, company_name, email_address, avatar_url",
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase.from("roles").select("role").eq("user_id", userId).single(),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      setProfiles(profilesRes.data || []);
      setUserRole((roleRes.data?.role as Role) ?? "user");
    } catch (error: any) {
      console.error("Error fetching profiles:", error);
      Alert.alert("Error", "Failed to load profiles.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [userId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfiles();
  };

  const handleWriteTag = async (profile: Profile) => {
    setWritingId(profile.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const result = await nfcService.writeProfileUrl(profile.id);
    if (result.success) {
      Alert.alert("Success", `Tag written for ${profile.first_name}!`);
    } else if (result.error !== "Write cancelled.") {
      Alert.alert("NFC Error", result.error || "Failed to write tag.");
    }
    setWritingId(null);
  };

  const handleEditProfile = (profileId: string) => {
    router.push({
      pathname: "/admin/user/edit-profile/[profileId]",
      params: { profileId },
    } as any);
  };

  const displayName =
    profiles.length > 0
      ? `${profiles[0].first_name} ${profiles[0].last_name}`
      : "User";

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading profiles…</Text>
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
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={styles.headerMeta}>
            <RoleBadge role={userRole} />
            <Text style={styles.headerSubtitle}>
              {profiles.length} profile{profiles.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
        {/* Spacer to balance back button */}
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        }
      >
        {profiles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <CreditCard size={48} color="#444" />
            </View>
            <Text style={styles.emptyTitle}>No Profiles</Text>
            <Text style={styles.emptyText}>This user has no profiles yet.</Text>
          </View>
        ) : (
          profiles.map((profile) => (
            <View key={profile.id} style={styles.cardContainer}>
              <LinearGradient
                colors={["#2c2c2e", "#1c1c1e"]}
                style={styles.cardGradient}
              >
                {/* Card top: avatar + NFC status */}
                <View style={styles.cardTop}>
                  <View style={styles.avatarContainer}>
                    {profile.avatar_url ? (
                      <Image
                        source={{ uri: profile.avatar_url }}
                        style={styles.avatar}
                      />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <User size={24} color="#8e8e93" />
                      </View>
                    )}
                  </View>
                  <View style={styles.writeIndicator}>
                    <Radio
                      size={14}
                      color={writingId === profile.id ? "#34C759" : "#8e8e93"}
                    />
                    <Text
                      style={[
                        styles.writeText,
                        writingId === profile.id && styles.writingActiveText,
                      ]}
                    >
                      {writingId === profile.id ? "Writing…" : "NFC Ready"}
                    </Text>
                  </View>
                </View>

                {/* Profile info */}
                <View style={styles.cardInfo}>
                  <Text style={styles.profileName}>
                    {profile.first_name} {profile.last_name}
                  </Text>
                  <View style={styles.infoRow}>
                    <Mail size={13} color="#8e8e93" />
                    <Text style={styles.infoText}>{profile.email_address}</Text>
                  </View>
                  {!!profile.job_title && (
                    <View style={styles.infoRow}>
                      <Building size={13} color="#8e8e93" />
                      <Text style={styles.infoText}>
                        {profile.job_title}
                        {profile.company_name
                          ? ` @ ${profile.company_name}`
                          : ""}
                      </Text>
                    </View>
                  )}
                  <View style={styles.infoRow}>
                    <IdCard size={13} color="#48484a" />
                    <Text style={styles.idText}>{profile.id}</Text>
                  </View>
                </View>

                {/* Action buttons */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditProfile(profile.id)}
                    activeOpacity={0.75}
                  >
                    <Edit size={16} color="#007AFF" />
                    <Text style={styles.editButtonText}>Edit Profile</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.nfcButton,
                      writingId === profile.id && styles.nfcButtonActive,
                      !!writingId &&
                        writingId !== profile.id &&
                        styles.nfcButtonDisabled,
                    ]}
                    onPress={() => handleWriteTag(profile)}
                    disabled={!!writingId}
                    activeOpacity={0.8}
                  >
                    <Radio
                      size={16}
                      color={writingId === profile.id ? "#34C759" : "#fff"}
                    />
                    <Text
                      style={[
                        styles.nfcButtonText,
                        writingId === profile.id && styles.nfcButtonTextActive,
                      ]}
                    >
                      {writingId === profile.id ? "Writing…" : "Write NFC"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          ))
        )}
      </ScrollView>
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
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1c1c1e",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#8e8e93",
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
  headerSpacer: {
    width: 44,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#1c1c1e",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  emptyText: {
    fontSize: 14,
    color: "#8e8e93",
    textAlign: "center",
  },
  cardContainer: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  cardGradient: {
    padding: 20,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#3a3a3c",
    overflow: "hidden",
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
  writeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1c1c1e",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#3a3a3c",
  },
  writeText: {
    fontSize: 12,
    color: "#8e8e93",
    fontWeight: "500",
  },
  writingActiveText: {
    color: "#34C759",
  },
  cardInfo: {
    gap: 6,
    marginBottom: 18,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  infoText: {
    fontSize: 14,
    color: "#8e8e93",
    flex: 1,
  },
  idText: {
    fontSize: 11,
    color: "#48484a",
    fontFamily: "monospace",
    flex: 1,
  },
  cardActions: {
    flexDirection: "row",
    gap: 10,
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#0a1628",
    borderWidth: 1,
    borderColor: "#1a3a5c",
  },
  editButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
  },
  nfcButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#007AFF",
  },
  nfcButtonActive: {
    backgroundColor: "#0a2a0a",
    borderWidth: 1,
    borderColor: "#34C759",
  },
  nfcButtonDisabled: {
    opacity: 0.4,
  },
  nfcButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  nfcButtonTextActive: {
    color: "#34C759",
  },
});
