import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  RefreshControl,
  Platform
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { nfcService } from '@/lib/nfc';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  CreditCard, 
  Mail, 
  IdCard, 
  LogOut, 
  Radio, 
  ChevronRight,
  User,
  Building
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

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
        .from('profiles')
        .select('id, first_name, last_name, job_title, company_name, email_address, avatar_url')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      console.error('Error fetching profiles:', error);
      Alert.alert('Error', 'Failed to load profiles.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfiles();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleWriteTag = async (profile: Profile) => {
    setWritingId(profile.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Attempt to write the tag
    const result = await nfcService.writeProfileUrl(profile.id);
    
    if (result.success) {
      Alert.alert('Success', `Tag updated successfully for ${profile.first_name}!`);
    } else if (result.error !== 'Write cancelled.') {
      Alert.alert('NFC Error', result.error || 'Failed to write tag.');
    }
    
    setWritingId(null);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Fetching your SmartTap profiles...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#0a0a0a']}
        style={styles.background}
      />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My SmartTap Cards</Text>
          <Text style={styles.headerSubtitle}>Select a profile to write to your tag</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <LogOut size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />
        }
      >
        {profiles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <CreditCard size={48} color="#444" />
            </View>
            <Text style={styles.emptyTitle}>No Profiles Found</Text>
            <Text style={styles.emptyText}>Create your first profile in the SmartTap web app to get started.</Text>
          </View>
        ) : (
          profiles.map((profile) => (
            <TouchableOpacity 
              key={profile.id}
              activeOpacity={0.9}
              style={styles.cardContainer}
              onPress={() => handleWriteTag(profile)}
            >
              <LinearGradient
                colors={['#2c2c2e', '#1c1c1e']}
                style={styles.cardGradient}
              >
                <View style={styles.cardTop}>
                  <View style={styles.avatarContainer}>
                    {profile.avatar_url ? (
                      <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <User size={24} color="#8e8e93" />
                      </View>
                    )}
                  </View>
                  <View style={styles.writeIndicator}>
                    <Radio size={16} color={writingId === profile.id ? "#34C759" : "#8e8e93"} />
                    <Text style={[styles.writeText, writingId === profile.id && styles.writingActiveText]}>
                      {writingId === profile.id ? 'Writing...' : 'Ready to write'}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardInfo}>
                  <Text style={styles.profileName}>{profile.first_name} {profile.last_name}</Text>
                  
                  <View style={styles.infoRow}>
                    <Mail size={14} color="#8e8e93" style={styles.infoIcon} />
                    <Text style={styles.infoText}>{profile.email_address}</Text>
                  </View>

                  {profile.job_title && (
                    <View style={styles.infoRow}>
                      <Building size={14} color="#8e8e93" style={styles.infoIcon} />
                      <Text style={styles.infoText}>{profile.job_title} {profile.company_name ? `@ ${profile.company_name}` : ''}</Text>
                    </View>
                  )}

                  <View style={styles.idRow}>
                    <IdCard size={14} color="#48484a" style={styles.infoIcon} />
                    <Text style={styles.idText}>ID: {profile.id}</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.tapPrompt}>Tap card to write NFC</Text>
                  <ChevronRight size={18} color="#007AFF" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 4,
  },
  signOutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1c1c1e',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  loadingText: {
    color: '#8e8e93',
    marginTop: 15,
    fontSize: 16,
  },
  cardContainer: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  cardGradient: {
    padding: 20,
    minHeight: 180,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3a3a3c',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#48484a',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  writeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  writeText: {
    color: '#8e8e93',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  writingActiveText: {
    color: '#34C759',
  },
  cardInfo: {
    marginBottom: 15,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    color: '#8e8e93',
    fontSize: 14,
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    opacity: 0.6,
  },
  idText: {
    fontSize: 11,
    color: '#636366',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  tapPrompt: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1c1c1e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    color: '#8e8e93',
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
});
