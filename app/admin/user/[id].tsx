import { nfcService } from "@/lib/nfc";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Building, CreditCard, Edit, IdCard, Mail, Radio, User } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

type Role = "user" | "social" | "admin" | "super_admin";

const ROLE_CONFIG: Record<Role, { label: string; bg: string; text: string }> = {
  super_admin: { label: "Super Admin", bg: "rgba(255,149,0,0.15)", text: "#FF9500" },
  admin:       { label: "Admin",       bg: "rgba(0,122,255,0.15)", text: "#007AFF" },
  social:      { label: "Social",      bg: "rgba(52,199,89,0.15)", text: "#34C759" },
  user:        { label: "User",        bg: "rgba(142,142,147,0.15)", text: "#8e8e93" },
};

function RoleBadge({ role }: { role: Role }) {
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.user;
  return (
    <View style={{ backgroundColor: cfg.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color: cfg.text, fontSize: 11, fontWeight: "600" }}>{cfg.label}</Text>
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
        supabase.from("profiles")
          .select("id, first_name, last_name, job_title, company_name, email_address, avatar_url")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase.from("roles").select("role").eq("user_id", userId).single(),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      setProfiles(profilesRes.data || []);
      setUserRole((roleRes.data?.role as Role) ?? "user");
    } catch {
      Alert.alert("Error", "Failed to load profiles.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchProfiles(); }, [userId]);

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
    router.push({ pathname: "/admin/user/edit-profile/[profileId]", params: { profileId } } as any);
  };

  const displayName = profiles.length > 0
    ? `${profiles[0].first_name} ${profiles[0].last_name}`
    : "User";

  if (loading && !refreshing) {
    return (
      <View style={{ flex:1, backgroundColor:colors.bg, justifyContent:"center", alignItems:"center", gap:12 }}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ color:colors.secondaryLabel, fontSize:15 }}>Loading profiles…</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: displayName,
          headerTitle: () => (
            <View style={{ alignItems: "center", gap: 2 }}>
              <Text style={{ fontSize: 17, fontWeight: "600", color: "#ffffff" }} numberOfLines={1}>
                {displayName}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <RoleBadge role={userRole} />
                <Text style={{ fontSize: 12, color: colors.secondaryLabel }}>
                  {profiles.length} profile{profiles.length !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding:16, gap:14, paddingBottom:40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchProfiles(); }}
            tintColor={colors.accent}
          />
        }
      >
        {profiles.length === 0 ? (
          <View style={{ alignItems:"center", paddingTop:80, gap:12 }}>
            <View style={{ width:80, height:80, borderRadius:20, borderCurve:"continuous", backgroundColor:colors.card, justifyContent:"center", alignItems:"center" }}>
              <CreditCard size={36} color={colors.quaternaryLabel} />
            </View>
            <Text style={{ fontSize:18, fontWeight:"600", color:colors.label }}>No Profiles</Text>
            <Text style={{ fontSize:14, color:colors.secondaryLabel, textAlign:"center" }}>This user has no profiles yet.</Text>
          </View>
        ) : (
          profiles.map((profile, index) => {
            const isWriting = writingId === profile.id;
            return (
              <Animated.View key={profile.id} entering={FadeInDown.delay(index * 60).springify()}>
                <View style={{ backgroundColor:colors.card, borderRadius:16, borderCurve:"continuous", borderWidth:1, borderColor:colors.cardBorder, overflow:"hidden", boxShadow:"0 4px 16px rgba(0,0,0,0.3)" }}>

                  {/* Profile header */}
                  <View style={{ padding:16, flexDirection:"row", alignItems:"center", gap:12 }}>
                    <View style={{ width:52, height:52, borderRadius:26, backgroundColor:colors.separator, overflow:"hidden" }}>
                      {profile.avatar_url ? (
                        <Image source={profile.avatar_url} style={{ width:52, height:52 }} contentFit="cover" />
                      ) : (
                        <View style={{ flex:1, justifyContent:"center", alignItems:"center" }}>
                          <User size={24} color={colors.secondaryLabel} />
                        </View>
                      )}
                    </View>
                    <View style={{ flex:1, gap:3 }}>
                      <Text style={{ fontSize:17, fontWeight:"700", color:colors.label }}>
                        {profile.first_name} {profile.last_name}
                      </Text>
                      <View style={{ gap:4 }}>
                        <View style={{ flexDirection:"row", alignItems:"center", gap:5 }}>
                          <Mail size={13} color={colors.tertiaryLabel} />
                          <Text style={{ fontSize:13, color:colors.secondaryLabel }} numberOfLines={1}>{profile.email_address}</Text>
                        </View>
                        {!!profile.job_title && (
                          <View style={{ flexDirection:"row", alignItems:"center", gap:5 }}>
                            <Building size={13} color={colors.tertiaryLabel} />
                            <Text style={{ fontSize:13, color:colors.secondaryLabel }}>
                              {profile.job_title}{profile.company_name ? ` @ ${profile.company_name}` : ""}
                            </Text>
                          </View>
                        )}
                        <View style={{ flexDirection:"row", alignItems:"center", gap:5 }}>
                          <IdCard size={12} color={colors.quaternaryLabel} />
                          <Text selectable style={{ fontSize:11, color:colors.quaternaryLabel, fontVariant:["tabular-nums"] }}>{profile.id}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Action buttons */}
                  <View style={{ flexDirection:"row", borderTopWidth:0.5, borderTopColor:colors.separator }}>
                    <TouchableOpacity
                      style={{ flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:7, paddingVertical:14 }}
                      onPress={() => handleEditProfile(profile.id)}
                      activeOpacity={0.7}
                    >
                      <Edit size={16} color={colors.accent} />
                      <Text style={{ color:colors.accent, fontSize:15, fontWeight:"600" }}>Edit Profile</Text>
                    </TouchableOpacity>

                    <View style={{ width:0.5, backgroundColor:colors.separator }} />

                    <TouchableOpacity
                      style={{ flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:7, paddingVertical:14, opacity:!!writingId && !isWriting ? 0.4 : 1 }}
                      onPress={() => handleWriteTag(profile)}
                      disabled={!!writingId}
                      activeOpacity={0.8}
                    >
                      <Radio size={16} color={isWriting ? colors.success : colors.label} />
                      <Text style={{ color:isWriting ? colors.success : colors.label, fontSize:15, fontWeight:"600" }}>
                        {isWriting ? "Writing…" : "Write NFC"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </>
  );
}