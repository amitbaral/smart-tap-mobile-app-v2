import { nfcService } from "@/lib/nfc";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Stack } from "expo-router";
import {
  Building,
  ChevronRight,
  CreditCard,
  IdCard,
  LogOut,
  Mail,
  Radio,
  User,
} from "lucide-react-native";
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

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  company_name: string | null;
  email_address: string;
  avatar_url: string | null;
}

export default function HomeScreen() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [writingId, setWritingId] = useState<string | null>(null);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, job_title, company_name, email_address, avatar_url")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setProfiles(data || []);
    } catch {
      Alert.alert("Error", "Failed to load profiles.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchProfiles(); }, []);

  const handleSignOut = async () => { await supabase.auth.signOut(); };

  const handleWriteTag = async (profile: Profile) => {
    setWritingId(profile.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const result = await nfcService.writeProfileUrl(profile.id);
    if (result.success) {
      Alert.alert("Success", `Tag updated for ${profile.first_name}!`);
    } else if (result.error !== "Write cancelled.") {
      Alert.alert("NFC Error", result.error || "Failed to write tag.");
    }
    setWritingId(null);
  };

  if (loading && !refreshing) {
    return (
      <View style={{ flex:1, backgroundColor:colors.bg, justifyContent:"center", alignItems:"center", gap:12 }}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ color:colors.secondaryLabel, fontSize:15 }}>Fetching your SmartTap profiles…</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "My SmartTap Cards",
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSignOut}
              style={{ width:36, height:36, borderRadius:18, backgroundColor:colors.card, justifyContent:"center", alignItems:"center" }}
              activeOpacity={0.7}
            >
              <LogOut size={18} color={colors.danger} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding:16, gap:14, paddingBottom:40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{ setRefreshing(true); fetchProfiles(); }} tintColor={colors.accent} />}
      >
        {profiles.length === 0 ? (
          <View style={{ alignItems:"center", paddingTop:80, gap:12 }}>
            <View style={{ width:80, height:80, borderRadius:20, borderCurve:"continuous", backgroundColor:colors.card, justifyContent:"center", alignItems:"center" }}>
              <CreditCard size={36} color={colors.quaternaryLabel} />
            </View>
            <Text style={{ fontSize:18, fontWeight:"600", color:colors.label }}>No Profiles Found</Text>
            <Text style={{ fontSize:14, color:colors.secondaryLabel, textAlign:"center", paddingHorizontal:32 }}>
              Create your first profile in the SmartTap web app to get started.
            </Text>
          </View>
        ) : (
          profiles.map((profile, index) => {
            const isWriting = writingId === profile.id;
            return (
              <Animated.View key={profile.id} entering={FadeInDown.delay(index * 60).springify()}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleWriteTag(profile)}
                  disabled={!!writingId && !isWriting}
                  style={{
                    backgroundColor:colors.card,
                    borderRadius:16,
                    borderCurve:"continuous",
                    borderWidth:1,
                    borderColor:colors.cardBorder,
                    padding:16,
                    gap:12,
                    opacity:!!writingId && !isWriting ? 0.5 : 1,
                    boxShadow:"0 4px 16px rgba(0,0,0,0.3)",
                  }}
                >
                  <View style={{ flexDirection:"row", justifyContent:"space-between", alignItems:"center" }}>
                    <View style={{ flexDirection:"row", gap:12, alignItems:"center", flex:1 }}>
                      <View style={{ width:48, height:48, borderRadius:24, backgroundColor:colors.separator, overflow:"hidden" }}>
                        {profile.avatar_url ? (
                          <Image source={profile.avatar_url} style={{ width:48, height:48 }} contentFit="cover" />
                        ) : (
                          <View style={{ flex:1, justifyContent:"center", alignItems:"center" }}>
                            <User size={22} color={colors.secondaryLabel} />
                          </View>
                        )}
                      </View>
                      <View style={{ gap:2, flex:1 }}>
                        <Text style={{ fontSize:17, fontWeight:"600", color:colors.label }}>{profile.first_name} {profile.last_name}</Text>
                        {!!profile.job_title && (
                          <Text style={{ fontSize:13, color:colors.secondaryLabel }}>
                            {profile.job_title}{profile.company_name ? ` · ${profile.company_name}` : ""}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={{ flexDirection:"row", alignItems:"center", gap:5, backgroundColor:isWriting?"rgba(52,199,89,0.12)":colors.separator, paddingHorizontal:10, paddingVertical:5, borderRadius:12, borderCurve:"continuous" }}>
                      <Radio size={14} color={isWriting ? colors.success : colors.secondaryLabel} />
                      <Text style={{ fontSize:12, fontWeight:"600", color:isWriting ? colors.success : colors.secondaryLabel }}>
                        {isWriting ? "Writing…" : "Write NFC"}
                      </Text>
                    </View>
                  </View>

                  <View style={{ gap:5 }}>
                    <View style={{ flexDirection:"row", alignItems:"center", gap:6 }}>
                      <Mail size={13} color={colors.tertiaryLabel} />
                      <Text style={{ fontSize:13, color:colors.secondaryLabel }} numberOfLines={1}>{profile.email_address}</Text>
                    </View>
                    {!!profile.job_title && (
                      <View style={{ flexDirection:"row", alignItems:"center", gap:6 }}>
                        <Building size={13} color={colors.tertiaryLabel} />
                        <Text style={{ fontSize:13, color:colors.secondaryLabel }} numberOfLines={1}>
                          {profile.job_title}{profile.company_name ? ` @ ${profile.company_name}` : ""}
                        </Text>
                      </View>
                    )}
                    <View style={{ flexDirection:"row", alignItems:"center", gap:6 }}>
                      <IdCard size={13} color={colors.quaternaryLabel} />
                      <Text selectable style={{ fontSize:11, color:colors.quaternaryLabel, fontVariant:["tabular-nums"] }}>{profile.id}</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection:"row", justifyContent:"space-between", alignItems:"center", paddingTop:8, borderTopWidth:0.5, borderTopColor:colors.separator }}>
                    <Text style={{ fontSize:13, color:colors.secondaryLabel }}>Tap to write NFC tag</Text>
                    <ChevronRight size={16} color={colors.accent} />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </>
  );
}