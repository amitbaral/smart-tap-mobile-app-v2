import { pickImage } from "@/lib/pickImage";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Check, Edit2, Plus, Trash2, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_BUCKET = "avatar"; // matches the bucket used by profile/edit/[id]/page.tsx

const PRESET_COLORS = [
  "#000000",
  "#111111",
  "#1a1a1a",
  "#2c2c2e",
  "#3a3a3c",
  "#636366",
  "#ffffff",
  "#f2f2f7",
  "#e5e5ea",
  "#d1d1d6",
  "#c7c7cc",
  "#8e8e93",
  "#007AFF",
  "#0066CC",
  "#003478",
  "#32ADE6",
  "#5AC8FA",
  "#00C7BE",
  "#34C759",
  "#30D158",
  "#248A3D",
  "#2DC653",
  "#28BD4B",
  "#1C7C33",
  "#FF9500",
  "#FF9F0A",
  "#FFD60A",
  "#FFCC00",
  "#E67E22",
  "#F39C12",
  "#FF3B30",
  "#FF453A",
  "#C0392B",
  "#FF2D55",
  "#FF375F",
  "#FF6B6B",
  "#AF52DE",
  "#BF5AF2",
  "#8E44AD",
  "#9B59B6",
  "#6C3483",
  "#4A235A",
  "#FF6B35",
  "#E74C3C",
  "#C0392B",
  "#16213E",
  "#0F3460",
  "#533483",
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileForm {
  first_name: string;
  middle_name: string;
  last_name: string;
  pronouns: string;
  job_title: string;
  email_address: string;
  mobile_number: string;
  profile_note: string;
  avatar_url: string;
  cover_image: string;          // actual DB column name
  street_address: string;
  street: string;               // actual DB column name (not street2)
  city: string;
  state_province: string;
  postcode: string;
  country: string;
  company_name: string;
  company_website: string;
  company_phone_number: string;
  contact_exchange_enabled: boolean;
  // Appearance — from profile_appearance_settings table
  background_color: string;
  text_color: string;
  button_color: string;
  button_text_color: string;
  override_company_template: boolean;
}

interface Product {
  id: string | null;
  title: string;
  description: string;
  _deleted?: boolean;
  _editing?: boolean;
}

interface SocialMediaLink {
  id: string | null;
  platform: string;
  url: string;
  _deleted?: boolean;
}

interface Service {
  id: string | null;
  title: string;
  description: string;
  price: string;
  _deleted?: boolean;
  _editing?: boolean;
}

interface QuickLink {
  id: string | null;
  link_name: string;  // actual DB column name
  url: string;
  _deleted?: boolean;
  _editing?: boolean;
}

const EMPTY_FORM: ProfileForm = {
  first_name: "",
  middle_name: "",
  last_name: "",
  pronouns: "",
  job_title: "",
  email_address: "",
  mobile_number: "",
  profile_note: "",
  avatar_url: "",
  cover_image: "",
  street_address: "",
  street: "",
  city: "",
  state_province: "",
  postcode: "",
  country: "",
  company_name: "",
  company_website: "",
  company_phone_number: "",
  contact_exchange_enabled: false,
  background_color: "",
  text_color: "",
  button_color: "",
  button_text_color: "",
  override_company_template: false,
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminEditProfile() {
  const { profileId } = useLocalSearchParams<{ profileId: string }>();
  const router = useRouter();

  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [products, setProducts] = useState<Product[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialMediaLink[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
  // sections_visibility table: section_name → is_visible
  const [sectionsVisibility, setSectionsVisibility] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [colorTarget, setColorTarget] = useState<keyof ProfileForm | null>(
    null,
  );
  const [colorDraft, setColorDraft] = useState("");
  const [colorHexInput, setColorHexInput] = useState("");

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/admin" as any);
  };

  const loadProfile = async () => {
    if (!profileId) return;
    try {
      const [profileRes, appearanceRes, productsRes, socialRes, servicesRes, quickRes, sectionsRes] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("id", profileId).single(),
          supabase
            .from("profile_appearance_settings")
            .select("background_color,text_color,button_color,button_text_color,override_company_template")
            .eq("profile_id", profileId)
            .maybeSingle(),
          supabase.from("products").select("id,title,description").eq("profile_id", profileId),
          supabase.from("social_media_links").select("id,platform,url").eq("profile_id", profileId),
          supabase.from("services").select("id,title,description,price").eq("profile_id", profileId),
          supabase.from("quick_links").select("id,link_name,url").eq("profile_id", profileId),
          supabase.from("sections_visibility").select("section_name,is_visible").eq("profile_id", profileId),
        ]);
      if (profileRes.error) throw profileRes.error;
      const d = profileRes.data;
      const a = appearanceRes.data;
      setForm({
        first_name: d.first_name ?? "",
        middle_name: d.middle_name ?? "",
        last_name: d.last_name ?? "",
        pronouns: d.pronouns ?? "",
        job_title: d.job_title ?? "",
        email_address: d.email_address ?? "",
        mobile_number: d.mobile_number ?? "",
        profile_note: d.profile_note ?? "",
        avatar_url: d.avatar_url ?? "",
        cover_image: d.cover_image ?? "",
        street_address: d.street_address ?? "",
        street: d.street ?? "",
        city: d.city ?? "",
        state_province: d.state_province ?? "",
        postcode: d.postcode ?? "",
        country: d.country ?? "",
        company_name: d.company_name ?? "",
        company_website: d.company_website ?? "",
        company_phone_number: d.company_phone_number ?? "",
        contact_exchange_enabled: d.contact_exchange_enabled ?? false,
        background_color: a?.background_color ?? "",
        text_color: a?.text_color ?? "",
        button_color: a?.button_color ?? "",
        button_text_color: a?.button_text_color ?? "",
        override_company_template: a?.override_company_template ?? false,
      });
      setProducts((productsRes.data || []).map((p) => ({ id: p.id, title: p.title, description: p.description ?? "" })));
      setSocialLinks((socialRes.data || []).map((s) => ({ id: s.id, platform: s.platform, url: s.url })));
      setServices((servicesRes.data || []).map((s) => ({ id: s.id, title: s.title, description: s.description ?? "", price: String(s.price ?? "") })));
      setQuickLinks((quickRes.data || []).map((q) => ({ id: q.id, link_name: q.link_name, url: q.url })));
      const vis: Record<string, boolean> = {};
      for (const row of sectionsRes.data || []) vis[row.section_name] = row.is_visible;
      setSectionsVisibility(vis);
    } catch {
      Alert.alert("Error", "Could not load profile.");
      goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [profileId]);

  const setField =
    <K extends keyof ProfileForm>(key: K) =>
    (value: ProfileForm[K]) =>
      setForm((prev) => ({ ...prev, [key]: value }));

  // ── Image upload ─────────────────────────────────────────────────────────

  const pickAndUpload = async (field: "avatar_url" | "cover_image") => {
    const asset = await pickImage(field === "avatar_url" ? [1, 1] : [3, 1]);
    if (!asset) return;
    setUploadingField(field);
    try {
      const ext = (asset.uri.split(".").pop() ?? "jpg").toLowerCase();
      const fileName = `${profileId}/${field}-${Date.now()}.${ext}`;
      const resp = await fetch(asset.uri);
      const buf = await resp.arrayBuffer();
      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, buf, {
          contentType: asset.mimeType ?? `image/${ext}`,
          upsert: true,
        });
      if (upErr) throw upErr;
      const {
        data: { publicUrl },
      } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
      setField(field)(publicUrl);
    } catch (e: any) {
      Alert.alert("Upload failed", e.message);
    } finally {
      setUploadingField(null);
    }
  };

  const removeImage = (field: "avatar_url" | "cover_image") =>
    setField(field)("");

  // ── Color picker ──────────────────────────────────────────────────────────

  const openColorPicker = (key: keyof ProfileForm) => {
    const current = form[key] as string;
    setColorTarget(key);
    setColorDraft(current);
    setColorHexInput(current);
  };

  const confirmColor = () => {
    if (colorTarget) setField(colorTarget as any)(colorDraft);
    setColorTarget(null);
  };

  // ── Social links CRUD ──────────────────────────────────────────────────────
  const addSocialLink    = () => setSocialLinks(p => [...p, { id: null, platform: "", url: "" }]);
  const updateSocialLink = (i: number, f: "platform" | "url", v: string) =>
    setSocialLinks(p => p.map((s, idx) => idx === i ? { ...s, [f]: v } : s));
  const deleteSocialLink = (i: number) =>
    setSocialLinks(p => p.map((s, idx) => idx === i ? { ...s, _deleted: true } : s));

  // ── Services CRUD ──────────────────────────────────────────────────────────
  const addService    = () => setServices(p => [...p, { id: null, title: "", description: "", price: "", _editing: true }]);
  const updateService = (i: number, f: "title" | "description" | "price", v: string) =>
    setServices(p => p.map((s, idx) => idx === i ? { ...s, [f]: v } : s));
  const toggleEditService = (i: number) =>
    setServices(p => p.map((s, idx) => idx === i ? { ...s, _editing: !s._editing } : s));
  const deleteService = (i: number) =>
    setServices(p => p.map((s, idx) => idx === i ? { ...s, _deleted: true } : s));

  // ── Quick links CRUD ───────────────────────────────────────────────────────
  const addQuickLink    = () => setQuickLinks(p => [...p, { id: null, link_name: "", url: "", _editing: true }]);
  const updateQuickLink = (i: number, f: "link_name" | "url", v: string) =>
    setQuickLinks(p => p.map((s, idx) => idx === i ? { ...s, [f]: v } : s));
  const toggleEditQuickLink = (i: number) =>
    setQuickLinks(p => p.map((s, idx) => idx === i ? { ...s, _editing: !s._editing } : s));
  const deleteQuickLink = (i: number) =>
    setQuickLinks(p => p.map((s, idx) => idx === i ? { ...s, _deleted: true } : s));

  // ── Products CRUD ─────────────────────────────────────────────────────────

  const addProduct = () =>
    setProducts((p) => [
      ...p,
      { id: null, title: "", description: "", _editing: true },
    ]);
  const updateProduct = (
    i: number,
    f: "title" | "description",
    v: string,
  ) =>
    setProducts((p) => p.map((s, idx) => (idx === i ? { ...s, [f]: v } : s)));
  const toggleEditProduct = (i: number) =>
    setProducts((p) =>
      p.map((s, idx) => (idx === i ? { ...s, _editing: !s._editing } : s)),
    );
  const deleteProduct = (i: number) =>
    setProducts((p) =>
      p.map((s, idx) => (idx === i ? { ...s, _deleted: true } : s)),
    );

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      Alert.alert("Validation", "First name and last name are required.");
      return;
    }
    setSaving(true);
    try {
      // ── Update profiles table ─────────────────────────────────────────
      const { error: pErr } = await supabase
        .from("profiles")
        .update({
          first_name: form.first_name.trim() || null,
          middle_name: form.middle_name.trim() || null,
          last_name: form.last_name.trim() || null,
          pronouns: form.pronouns.trim() || null,
          job_title: form.job_title.trim() || null,
          email_address: form.email_address.trim() || null,
          mobile_number: form.mobile_number.trim() || null,
          profile_note: form.profile_note.trim() || null,
          avatar_url: form.avatar_url.trim() || null,
          cover_image: form.cover_image.trim() || null,
          street_address: form.street_address.trim() || null,
          street: form.street.trim() || null,
          city: form.city.trim() || null,
          state_province: form.state_province.trim() || null,
          postcode: form.postcode.trim() || null,
          country: form.country.trim() || null,
          company_name: form.company_name.trim() || null,
          company_website: form.company_website.trim() || null,
          company_phone_number: form.company_phone_number.trim() || null,
          contact_exchange_enabled: form.contact_exchange_enabled,
        })
        .eq("id", profileId);
      if (pErr) throw pErr;

      // ── Upsert profile_appearance_settings ────────────────────────────
      const { error: aErr } = await supabase
        .from("profile_appearance_settings")
        .upsert({
          profile_id: profileId,
          background_color: form.background_color || "#ffffff",
          text_color: form.text_color || "#000000",
          button_color: form.button_color || "#000000",
          button_text_color: form.button_text_color || "#ffffff",
          override_company_template: form.override_company_template,
        }, { onConflict: "profile_id" });
      if (aErr) throw aErr;

      // ── Products CRUD ─────────────────────────────────────────────────
      const del = products.filter((p) => p._deleted && p.id);
      const ins = products.filter((p) => !p._deleted && !p.id && p.title.trim());
      const upd = products.filter((p) => !p._deleted && !!p.id);
      await Promise.all([
        ...del.map((p) => supabase.from("products").delete().eq("id", p.id!)),
        ins.length > 0 ? supabase.from("products").insert(ins.map((p) => ({ profile_id: profileId, title: p.title.trim(), description: p.description.trim() || null }))) : Promise.resolve(),
        ...upd.map((p) => supabase.from("products").update({ title: p.title.trim(), description: p.description.trim() || null }).eq("id", p.id!)),
      ]);

      // ── Social media links CRUD ────────────────────────────────────────
      const sDel = socialLinks.filter(s => s._deleted && s.id);
      const sIns = socialLinks.filter(s => !s._deleted && !s.id && s.platform.trim());
      const sUpd = socialLinks.filter(s => !s._deleted && !!s.id);
      await Promise.all([
        ...sDel.map(s => supabase.from("social_media_links").delete().eq("id", s.id!)),
        sIns.length > 0 ? supabase.from("social_media_links").insert(sIns.map(s => ({ profile_id: profileId, platform: s.platform.trim(), url: s.url.trim() }))) : Promise.resolve(),
        ...sUpd.map(s => supabase.from("social_media_links").update({ platform: s.platform.trim(), url: s.url.trim() }).eq("id", s.id!)),
      ]);

      // ── Services CRUD ──────────────────────────────────────────────────
      const svDel = services.filter(s => s._deleted && s.id);
      const svIns = services.filter(s => !s._deleted && !s.id && s.title.trim());
      const svUpd = services.filter(s => !s._deleted && !!s.id);
      await Promise.all([
        ...svDel.map(s => supabase.from("services").delete().eq("id", s.id!)),
        svIns.length > 0 ? supabase.from("services").insert(svIns.map(s => ({ profile_id: profileId, title: s.title.trim(), description: s.description.trim() || null, price: s.price ? Number(s.price) : null }))) : Promise.resolve(),
        ...svUpd.map(s => supabase.from("services").update({ title: s.title.trim(), description: s.description.trim() || null, price: s.price ? Number(s.price) : null }).eq("id", s.id!)),
      ]);

      // ── Quick links CRUD ───────────────────────────────────────────────
      const qDel = quickLinks.filter(q => q._deleted && q.id);
      const qIns = quickLinks.filter(q => !q._deleted && !q.id && q.link_name.trim());
      const qUpd = quickLinks.filter(q => !q._deleted && !!q.id);
      await Promise.all([
        ...qDel.map(q => supabase.from("quick_links").delete().eq("id", q.id!)),
        qIns.length > 0 ? supabase.from("quick_links").insert(qIns.map(q => ({ profile_id: profileId, link_name: q.link_name.trim(), url: q.url.trim() }))) : Promise.resolve(),
        ...qUpd.map(q => supabase.from("quick_links").update({ link_name: q.link_name.trim(), url: q.url.trim() }).eq("id", q.id!)),
      ]);

      // ── Sections visibility ────────────────────────────────────────────
      const visEntries = Object.entries(sectionsVisibility);
      if (visEntries.length > 0) {
        await supabase.from("sections_visibility").upsert(
          visEntries.map(([section_name, is_visible]) => ({ profile_id: profileId, section_name, is_visible })),
          { onConflict: "profile_id,section_name" }
        );
      }

      Alert.alert("Saved", "Profile updated successfully.", [
        { text: "OK", onPress: goBack },
      ]);
    } catch (e: any) {
      Alert.alert("Error", `Failed to save: ${e.message ?? ""}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
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
          Loading profile…
        </Text>
      </View>
    );

  const visibleProducts = products
    .map((s, i) => ({ ...s, i }))
    .filter((s) => !s._deleted);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Edit Profile",
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={{ opacity: saving ? 0.5 : 1 }}
              activeOpacity={0.7}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Text
                  style={{
                    color: colors.accent,
                    fontSize: 17,
                    fontWeight: "600",
                  }}
                >
                  Save
                </Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />

      {/* Color picker modal */}
      <ColorPickerModal
        visible={!!colorTarget}
        label={colorTarget?.replace(/_/g, " ") ?? ""}
        draft={colorDraft}
        hexInput={colorHexInput}
        onSwatchPress={(c) => {
          setColorDraft(c);
          setColorHexInput(c);
        }}
        onHexChange={(h) => {
          setColorHexInput(h);
          if (/^#[0-9a-fA-F]{6}$/.test(h)) setColorDraft(h);
        }}
        onConfirm={confirmColor}
        onCancel={() => setColorTarget(null)}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={10}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ══ PERSONAL INFORMATION ═══════════════════════ */}
          <SectionLabel>PERSONAL INFORMATION</SectionLabel>
          <View style={styles.section}>
            <FieldRow
              label="First Name"
              value={form.first_name}
              onChange={setField("first_name")}
              autoCapitalize="words"
              isFirst
            />
            <Divider />
            <FieldRow
              label="Middle Name"
              value={form.middle_name}
              onChange={setField("middle_name")}
              autoCapitalize="words"
            />
            <Divider />
            <FieldRow
              label="Last Name"
              value={form.last_name}
              onChange={setField("last_name")}
              autoCapitalize="words"
            />
            <Divider />
            <FieldRow
              label="Pronouns"
              value={form.pronouns}
              onChange={setField("pronouns")}
              placeholder="e.g. she/her"
            />
            <Divider />
            <FieldRow
              label="Job Title"
              value={form.job_title}
              onChange={setField("job_title")}
              autoCapitalize="words"
            />
            <Divider />
            <FieldRow
              label="Email"
              value={form.email_address}
              onChange={setField("email_address")}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Divider />
            <FieldRow
              label="Mobile"
              value={form.mobile_number}
              onChange={setField("mobile_number")}
              keyboardType="phone-pad"
            />
            <Divider />
            <FieldRow
              label="Profile Note"
              value={form.profile_note}
              onChange={setField("profile_note")}
              placeholder="Short bio…"
              multiline
              isLast
            />
          </View>

          {/* ══ PHOTOS ═════════════════════════════════════ */}
          <SectionLabel>PHOTOS</SectionLabel>
          <View style={styles.section}>
            <ImagePickerField
              label="Profile Photo"
              value={form.avatar_url}
              uploading={uploadingField === "avatar_url"}
              onPick={() => pickAndUpload("avatar_url")}
              onRemove={() => removeImage("avatar_url")}
              aspectLabel="1:1 square"
              isFirst
              isLast={false}
            />
            <Divider />
            <ImagePickerField
              label="Cover Photo"
              value={form.cover_image}
              uploading={uploadingField === "cover_image"}
              onPick={() => pickAndUpload("cover_image")}
              onRemove={() => removeImage("cover_image")}
              aspectLabel="3:1 wide"
              isFirst={false}
              isLast
            />
          </View>

          {/* ══ LOCATION ═══════════════════════════════════ */}
          <SectionLabel>LOCATION</SectionLabel>
          <View style={styles.section}>
            <FieldRow
              label="Street Address"
              value={form.street_address}
              onChange={setField("street_address")}
              autoCapitalize="words"
              isFirst
            />
            <Divider />
            <FieldRow
              label="Street Line 2"
              value={form.street2}
              onChange={setField("street2")}
              autoCapitalize="words"
            />
            <Divider />
            <FieldRow
              label="City"
              value={form.city}
              onChange={setField("city")}
              autoCapitalize="words"
            />
            <Divider />
            <FieldRow
              label="State/Province"
              value={form.state_province}
              onChange={setField("state_province")}
              autoCapitalize="words"
            />
            <Divider />
            <FieldRow
              label="Postcode"
              value={form.postcode}
              onChange={setField("postcode")}
              keyboardType="numbers-and-punctuation"
            />
            <Divider />
            <FieldRow
              label="Country"
              value={form.country}
              onChange={setField("country")}
              autoCapitalize="words"
              isLast
            />
          </View>

          {/* ══ COMPANY ════════════════════════════════════ */}
          <SectionLabel>COMPANY INFORMATION</SectionLabel>
          <View style={styles.section}>
            <ToggleRow
              label="Show Company Info"
              value={form.show_company_info}
              onValueChange={setField("show_company_info")}
              isFirst
            />
            <Divider />
            <FieldRow
              label="Company Name"
              value={form.company_name}
              onChange={setField("company_name")}
              autoCapitalize="words"
            />
            <Divider />
            <FieldRow
              label="Website"
              value={form.company_website}
              onChange={setField("company_website")}
              keyboardType="url"
              autoCapitalize="none"
              placeholder="https://…"
            />
            <Divider />
            <FieldRow
              label="Company Phone"
              value={form.company_phone_number}
              onChange={setField("company_phone_number")}
              keyboardType="phone-pad"
              isLast
            />
          </View>

          {/* ══ SOCIAL MEDIA LINKS ═════════════════════════ */}
          <SectionLabel>SOCIAL LINKS</SectionLabel>
          <View style={styles.section}>
            <ToggleRow
              label="Show Social Links"
              value={sectionsVisibility["social_media_links"] ?? true}
              onValueChange={v => setSectionsVisibility(prev => ({ ...prev, social_media_links: v }))}
              isFirst
              isLast={socialLinks.filter(s => !s._deleted).length === 0}
            />
            {socialLinks.filter(s => !s._deleted).map((link, idx) => (
              <View key={idx}>
                <Divider />
                <View style={styles.socialRow}>
                  <View style={styles.socialFields}>
                    <TextInput style={styles.socialPlatformInput} value={link.platform}
                      onChangeText={v => updateSocialLink(socialLinks.indexOf(link), "platform", v)}
                      placeholder="Platform (e.g. LinkedIn)" placeholderTextColor="#48484a" autoCorrect={false} />
                    <TextInput style={styles.socialUrlInput} value={link.url}
                      onChangeText={v => updateSocialLink(socialLinks.indexOf(link), "url", v)}
                      placeholder="https://…" placeholderTextColor="#48484a" keyboardType="url" autoCapitalize="none" autoCorrect={false} />
                  </View>
                  <TouchableOpacity onPress={() => deleteSocialLink(socialLinks.indexOf(link))} style={styles.deleteButton}>
                    <Trash2 size={18} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
          <AddButton label="Add Social Link" onPress={addSocialLink} />

          {/* ══ SERVICES ═══════════════════════════════════ */}
          <SectionLabel>SERVICES</SectionLabel>
          <View style={styles.section}>
            <ToggleRow
              label="Show Services"
              value={sectionsVisibility["services"] ?? true}
              onValueChange={v => setSectionsVisibility(prev => ({ ...prev, services: v }))}
              isFirst
              isLast={services.filter(s => !s._deleted).length === 0}
            />
            {services.filter(s => !s._deleted).map((item, idx) => {
              const realIdx = services.indexOf(item);
              return (
                <View key={idx}>
                  <Divider />
                  {item._editing ? (
                    <View style={styles.crudEditBlock}>
                      <Text style={styles.fieldLabel}>TITLE</Text>
                      <TextInput style={styles.crudInput} value={item.title} onChangeText={v => updateService(realIdx, "title", v)} placeholder="Service name" placeholderTextColor="#48484a" autoCapitalize="words" />
                      <Text style={[styles.fieldLabel, { marginTop: 10 }]}>DESCRIPTION</Text>
                      <TextInput style={[styles.crudInput, styles.crudInputMultiline]} value={item.description} onChangeText={v => updateService(realIdx, "description", v)} placeholder="Short description…" placeholderTextColor="#48484a" multiline numberOfLines={3} />
                      <Text style={[styles.fieldLabel, { marginTop: 10 }]}>PRICE</Text>
                      <TextInput style={styles.crudInput} value={item.price} onChangeText={v => updateService(realIdx, "price", v)} placeholder="e.g. 99.00" placeholderTextColor="#48484a" keyboardType="decimal-pad" />
                      <View style={styles.crudActions}>
                        <TouchableOpacity style={styles.crudDone} onPress={() => toggleEditService(realIdx)}><Check size={15} color="#fff" /><Text style={styles.crudDoneText}>Done</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.crudDeleteBtn} onPress={() => deleteService(realIdx)}><Trash2 size={15} color="#FF3B30" /><Text style={styles.crudDeleteText}>Remove</Text></TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.crudRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.crudRowTitle}>{item.title || "Untitled service"}</Text>
                        {!!item.description && <Text style={styles.crudRowSub} numberOfLines={1}>{item.description}</Text>}
                        {!!item.price && <Text style={styles.crudRowSub}>${item.price}</Text>}
                      </View>
                      <TouchableOpacity onPress={() => toggleEditService(realIdx)} style={styles.crudRowBtn}><Edit2 size={16} color="#007AFF" /></TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteService(realIdx)} style={styles.crudRowBtn}><Trash2 size={16} color="#FF3B30" /></TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
          <AddButton label="Add Service" onPress={addService} />

          {/* ══ QUICK LINKS ════════════════════════════════ */}
          <SectionLabel>QUICK LINKS</SectionLabel>
          <View style={styles.section}>
            <ToggleRow
              label="Show Quick Links"
              value={sectionsVisibility["quick_links"] ?? true}
              onValueChange={v => setSectionsVisibility(prev => ({ ...prev, quick_links: v }))}
              isFirst
              isLast={quickLinks.filter(q => !q._deleted).length === 0}
            />
            {quickLinks.filter(q => !q._deleted).map((item, idx) => {
              const realIdx = quickLinks.indexOf(item);
              return (
                <View key={idx}>
                  <Divider />
                  {item._editing ? (
                    <View style={styles.crudEditBlock}>
                      <Text style={styles.fieldLabel}>LABEL</Text>
                      <TextInput style={styles.crudInput} value={item.link_name} onChangeText={v => updateQuickLink(realIdx, "link_name", v)} placeholder="Link label" placeholderTextColor="#48484a" autoCapitalize="words" />
                      <Text style={[styles.fieldLabel, { marginTop: 10 }]}>URL</Text>
                      <TextInput style={styles.crudInput} value={item.url} onChangeText={v => updateQuickLink(realIdx, "url", v)} placeholder="https://…" placeholderTextColor="#48484a" keyboardType="url" autoCapitalize="none" />
                      <View style={styles.crudActions}>
                        <TouchableOpacity style={styles.crudDone} onPress={() => toggleEditQuickLink(realIdx)}><Check size={15} color="#fff" /><Text style={styles.crudDoneText}>Done</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.crudDeleteBtn} onPress={() => deleteQuickLink(realIdx)}><Trash2 size={15} color="#FF3B30" /><Text style={styles.crudDeleteText}>Remove</Text></TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.crudRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.crudRowTitle}>{item.link_name || "Untitled link"}</Text>
                        {!!item.url && <Text style={styles.crudRowSub} numberOfLines={1}>{item.url}</Text>}
                      </View>
                      <TouchableOpacity onPress={() => toggleEditQuickLink(realIdx)} style={styles.crudRowBtn}><Edit2 size={16} color="#007AFF" /></TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteQuickLink(realIdx)} style={styles.crudRowBtn}><Trash2 size={16} color="#FF3B30" /></TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
          <AddButton label="Add Quick Link" onPress={addQuickLink} />

          {/* ══ PRODUCTS ═══════════════════════════════════ */}
          <SectionLabel>PRODUCTS</SectionLabel>
          <View style={styles.section}>
            <ToggleRow
              label="Show Products"
              value={sectionsVisibility["products"] ?? true}
              onValueChange={v => setSectionsVisibility(prev => ({ ...prev, products: v }))}
              isFirst
              isLast={visibleProducts.length === 0}
            />
            {visibleProducts.map((item) => (
              <View key={item.i}>
                <Divider />
                {item._editing ? (
                  <View style={styles.crudEditBlock}>
                    <Text style={styles.fieldLabel}>TITLE</Text>
                    <TextInput
                      style={styles.crudInput}
                      value={item.title}
                      onChangeText={(v) => updateProduct(item.i, "title", v)}
                      placeholder="Product name"
                      placeholderTextColor="#48484a"
                      autoCapitalize="words"
                    />
                    <Text style={[styles.fieldLabel, { marginTop: 10 }]}>
                      DESCRIPTION
                    </Text>
                    <TextInput
                      style={[styles.crudInput, styles.crudInputMultiline]}
                      value={item.description}
                      onChangeText={(v) =>
                        updateProduct(item.i, "description", v)
                      }
                      placeholder="Short description…"
                      placeholderTextColor="#48484a"
                      multiline
                      numberOfLines={3}
                    />
                    <View style={styles.crudActions}>
                      <TouchableOpacity
                        style={styles.crudDone}
                        onPress={() => toggleEditProduct(item.i)}
                      >
                        <Check size={15} color="#fff" />
                        <Text style={styles.crudDoneText}>Done</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.crudDeleteBtn}
                        onPress={() => deleteProduct(item.i)}
                      >
                        <Trash2 size={15} color="#FF3B30" />
                        <Text style={styles.crudDeleteText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.crudRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.crudRowTitle}>
                        {item.title || "Untitled product"}
                      </Text>
                      {!!item.description && (
                        <Text style={styles.crudRowSub} numberOfLines={1}>
                          {item.description}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => toggleEditProduct(item.i)}
                      style={styles.crudRowBtn}
                    >
                      <Edit2 size={16} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteProduct(item.i)}
                      style={styles.crudRowBtn}
                    >
                      <Trash2 size={16} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
          <AddButton label="Add Product" onPress={addProduct} />

          {/* ══ APPEARANCE ═════════════════════════════════ */}
          <SectionLabel>PROFILE APPEARANCE</SectionLabel>
          <View style={styles.section}>
            <ColorPickerField
              label="Background Color"
              value={form.background_color}
              onPress={() => openColorPicker("background_color")}
              isFirst
            />
            <Divider />
            <ColorPickerField
              label="Text Color"
              value={form.text_color}
              onPress={() => openColorPicker("text_color")}
            />
            <Divider />
            <ColorPickerField
              label="Button Color"
              value={form.button_color}
              onPress={() => openColorPicker("button_color")}
            />
            <Divider />
            <ColorPickerField
              label="Button Text Color"
              value={form.button_text_color}
              onPress={() => openColorPicker("button_text_color")}
              isLast
            />
          </View>

          {/* ══ VISIBILITY ═════════════════════════════════ */}
          <SectionLabel>VISIBILITY SETTINGS</SectionLabel>
          <View style={styles.section}>
            <ToggleRow
              label="Contact Exchange Form"
              value={form.contact_exchange_enabled}
              onValueChange={setField("contact_exchange_enabled")}
              isFirst
              isLast
            />
          </View>

          <Text style={styles.idText} selectable>
            Profile ID: {profileId}
          </Text>

          <TouchableOpacity
            style={[styles.saveCta, saving && styles.saveCtaDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Check size={18} color="#fff" />
                <Text style={styles.saveCtaText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}
function Divider() {
  return <View style={styles.divider} />;
}
function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.addButton}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Plus size={16} color="#007AFF" />
      <Text style={styles.addButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

interface FieldRowProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?:
    | "default"
    | "email-address"
    | "url"
    | "phone-pad"
    | "numeric"
    | "numbers-and-punctuation"
    | "decimal-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}
function FieldRow({
  label,
  value,
  onChange,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "sentences",
  multiline = false,
  isFirst,
  isLast,
}: FieldRowProps) {
  return (
    <View
      style={[
        styles.fieldRow,
        isFirst && styles.fieldRowFirst,
        isLast && styles.fieldRowLast,
      ]}
    >
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldInputMultiline]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? label}
        placeholderTextColor="#48484a"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        returnKeyType={multiline ? "default" : "done"}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onValueChange,
  isFirst,
  isLast,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.toggleRow,
        isFirst && styles.fieldRowFirst,
        isLast && styles.fieldRowLast,
      ]}
    >
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#3a3a3c", true: "#007AFF" }}
        thumbColor="#fff"
        ios_backgroundColor="#3a3a3c"
      />
    </View>
  );
}

interface ImagePickerFieldProps {
  label: string;
  value: string;
  uploading: boolean;
  onPick: () => void;
  onRemove: () => void;
  aspectLabel: string;
  isFirst: boolean;
  isLast: boolean;
}
function ImagePickerField({
  label,
  value,
  uploading,
  onPick,
  onRemove,
  aspectLabel,
  isFirst,
  isLast,
}: ImagePickerFieldProps) {
  return (
    <View
      style={[
        styles.imagePickerRow,
        isFirst && styles.fieldRowFirst,
        isLast && styles.fieldRowLast,
      ]}
    >
      <View style={styles.imagePickerLeft}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.imagePickerHint}>{aspectLabel}</Text>
      </View>
      <View style={styles.imagePickerRight}>
        {value ? (
          <View style={styles.imagePreviewContainer}>
            <Image
              source={{ uri: value }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
            {!uploading && (
              <TouchableOpacity
                onPress={onRemove}
                style={styles.imageRemoveBtn}
                activeOpacity={0.8}
              >
                <X size={12} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        ) : null}
        <TouchableOpacity
          onPress={onPick}
          style={[styles.imagePickBtn, uploading && { opacity: 0.6 }]}
          disabled={uploading}
          activeOpacity={0.8}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Text style={styles.imagePickBtnText}>
              {value ? "Replace" : "Upload"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ColorPickerField({
  label,
  value,
  onPress,
  isFirst,
  isLast,
}: {
  label: string;
  value: string;
  onPress: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const isValid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.fieldRow,
        isFirst && styles.fieldRowFirst,
        isLast && styles.fieldRowLast,
      ]}
    >
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.colorRow}>
        <View
          style={[
            styles.colorSwatch,
            { backgroundColor: isValid ? value : "#2c2c2e" },
          ]}
        />
        <Text
          style={[
            styles.fieldInput,
            { flex: 1, color: value ? "#fff" : "#48484a" },
          ]}
        >
          {value || "Tap to choose"}
        </Text>
        <Edit2 size={14} color="#8e8e93" />
      </View>
    </TouchableOpacity>
  );
}

interface ColorPickerModalProps {
  visible: boolean;
  label: string;
  draft: string;
  hexInput: string;
  onSwatchPress: (c: string) => void;
  onHexChange: (h: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}
function ColorPickerModal({
  visible,
  label,
  draft,
  hexInput,
  onSwatchPress,
  onHexChange,
  onConfirm,
  onCancel,
}: ColorPickerModalProps) {
  const isValid = /^#[0-9a-fA-F]{6}$/.test(draft);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <Pressable style={styles.modalOverlay} onPress={onCancel}>
        <Pressable
          style={styles.modalCard}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{label.replace(/_/g, " ")}</Text>
            <TouchableOpacity onPress={onCancel}>
              <X size={20} color="#8e8e93" />
            </TouchableOpacity>
          </View>
          {/* Preview */}
          <View
            style={[
              styles.colorPreview,
              { backgroundColor: isValid ? draft : "#2c2c2e" },
            ]}
          >
            <Text
              style={{
                color: isValid ? "rgba(255,255,255,0.7)" : "#48484a",
                fontSize: 12,
              }}
            >
              {isValid ? draft : "No color"}
            </Text>
          </View>
          {/* Swatches */}
          <View style={styles.swatchGrid}>
            {PRESET_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => onSwatchPress(c)}
                activeOpacity={0.8}
                style={[
                  styles.swatch,
                  { backgroundColor: c },
                  draft === c && styles.swatchSelected,
                ]}
              />
            ))}
          </View>
          {/* Hex input */}
          <View style={styles.hexRow}>
            <Text style={styles.hexLabel}>#</Text>
            <TextInput
              style={styles.hexInput}
              value={hexInput.replace(/^#/, "")}
              onChangeText={(v) =>
                onHexChange("#" + v.replace(/[^0-9a-fA-F]/g, "").slice(0, 6))
              }
              placeholder="000000"
              placeholderTextColor="#48484a"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={6}
            />
          </View>
          {/* Buttons */}
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalCancel} onPress={onCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalConfirm} onPress={onConfirm}>
              <Text style={styles.modalConfirmText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
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
  },
  loadingText: { color: "#8e8e93", marginTop: 15, fontSize: 16 },
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
  headerCenter: { flex: 1, alignItems: "center", paddingHorizontal: 12 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  headerSubtitle: { fontSize: 13, color: "#8e8e93", marginTop: 2 },
  saveButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0a1628",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1a3a5c",
  },
  saveButtonDisabled: { opacity: 0.5 },
  scrollContent: { padding: 20, paddingBottom: 60 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8e8e93",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 28,
    marginLeft: 4,
  },
  section: {
    backgroundColor: "#1c1c1e",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  fieldRow: {
    backgroundColor: "#1c1c1e",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fieldRowFirst: { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  fieldRowLast: { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8e8e93",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  fieldInput: {
    fontSize: 16,
    color: "#fff",
    paddingVertical: 2,
    minHeight: 26,
  },
  fieldInputMultiline: { minHeight: 70, textAlignVertical: "top" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1c1c1e",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toggleLabel: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
    flex: 1,
    marginRight: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#3a3a3c",
    marginLeft: 16,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: "#0a1628",
    borderWidth: 1,
    borderColor: "#1a3a5c",
  },
  addButtonText: { color: "#007AFF", fontSize: 15, fontWeight: "600" },
  idText: {
    fontSize: 11,
    color: "#48484a",
    textAlign: "center",
    marginTop: 24,
    fontFamily: "monospace",
  },
  saveCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#007AFF",
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 20,
  },
  saveCtaDisabled: { opacity: 0.6 },
  saveCtaText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  // Social links
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 10,
    backgroundColor: "#1c1c1e",
  },
  socialFields: { flex: 1, gap: 5 },
  socialPlatformInput: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    paddingVertical: 2,
  },
  socialUrlInput: { fontSize: 13, color: "#8e8e93", paddingVertical: 2 },
  deleteButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  // CRUD rows
  crudRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 12,
    backgroundColor: "#1c1c1e",
  },
  crudRowTitle: { fontSize: 15, fontWeight: "600", color: "#fff" },
  crudRowSub: { fontSize: 12, color: "#8e8e93", marginTop: 2 },
  crudRowBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  crudEditBlock: { backgroundColor: "#1c1c1e", padding: 16 },
  crudInput: {
    fontSize: 16,
    color: "#fff",
    backgroundColor: "#2c2c2e",
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  crudInputMultiline: { minHeight: 72, textAlignVertical: "top" },
  crudActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  crudDone: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#007AFF",
    borderRadius: 10,
    paddingVertical: 10,
  },
  crudDoneText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  crudDeleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#3a3a3c",
  },
  crudDeleteText: { color: "#FF3B30", fontWeight: "600", fontSize: 14 },
  // Image picker
  imagePickerRow: {
    backgroundColor: "#1c1c1e",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  imagePickerLeft: { flex: 1 },
  imagePickerHint: { fontSize: 12, color: "#636366", marginTop: 2 },
  imagePickerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  imagePreviewContainer: { position: "relative" },
  imagePreview: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: "#2c2c2e",
  },
  imageRemoveBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePickBtn: {
    backgroundColor: "#1a3a5c",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#1a3a5c",
  },
  imagePickBtnText: { color: "#007AFF", fontWeight: "600", fontSize: 14 },
  // Color picker field
  colorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3a3a3c",
  },
  // Color picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#1c1c1e",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#3a3a3c",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    textTransform: "capitalize",
  },
  colorPreview: {
    height: 48,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  swatchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 12,
    gap: 6,
    justifyContent: "center",
    marginTop: 8,
  },
  swatch: { width: 36, height: 36, borderRadius: 8 },
  swatchSelected: { borderWidth: 3, borderColor: "#fff" },
  hexRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#2c2c2e",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  hexLabel: { fontSize: 16, color: "#8e8e93", marginRight: 4 },
  hexInput: { flex: 1, fontSize: 16, color: "#fff", fontFamily: "monospace" },
  modalButtons: { flexDirection: "row", gap: 10, padding: 16 },
  modalCancel: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#2c2c2e",
  },
  modalCancelText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  modalConfirm: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#007AFF",
  },
  modalConfirmText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
