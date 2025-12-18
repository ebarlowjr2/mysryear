import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Linking
} from 'react-native'
import { useRouter, Href } from 'expo-router'
import { useSession } from '../../src/hooks/useSession'
import { 
  getScholarships, 
  getSavedScholarshipIds, 
  saveScholarship, 
  unsaveScholarship,
  searchScholarships,
  sortByDeadline,
  formatDeadline,
  Scholarship
} from '../../src/data/scholarships'
import { colors, ui, radius, shadow } from '../../src/theme'

type Tab = 'all' | 'saved'

export default function ScholarshipsScreen() {
  const router = useRouter()
  const { user, loading: sessionLoading } = useSession()
  const [scholarships, setScholarships] = useState<Scholarship[]>([])
  const [savedIds, setSavedIds] = useState<Map<string, 'saved' | 'applied'>>(new Map())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('all')

  const loadData = useCallback(async (userId: string) => {
    try {
      setError(null)
      const [scholarshipsData, savedData] = await Promise.all([
        getScholarships(),
        getSavedScholarshipIds(userId)
      ])
      setScholarships(sortByDeadline(scholarshipsData))
      setSavedIds(savedData)
    } catch (err) {
      setError('Failed to load scholarships')
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (sessionLoading) return
    if (!user?.id) {
      setLoading(false)
      return
    }
    loadData(user.id)
  }, [sessionLoading, user?.id, loadData])

  const handleRefresh = useCallback(() => {
    if (!user?.id) return
    setRefreshing(true)
    loadData(user.id)
  }, [loadData, user?.id])

  const handleSaveToggle = useCallback(async (scholarshipId: string) => {
    if (!user?.id) return

    const currentStatus = savedIds.get(scholarshipId)
    const newSavedIds = new Map(savedIds)

    try {
      if (currentStatus) {
        await unsaveScholarship(user.id, scholarshipId)
        newSavedIds.delete(scholarshipId)
      } else {
        await saveScholarship(user.id, scholarshipId)
        newSavedIds.set(scholarshipId, 'saved')
      }
      setSavedIds(newSavedIds)
    } catch (err) {
      console.error('Failed to save/unsave scholarship:', err)
    }
  }, [user?.id, savedIds])

  const handleApply = useCallback((link: string) => {
    Linking.openURL(link)
  }, [])

  const filteredScholarships = useMemo(() => {
    let filtered = searchScholarships(scholarships, searchQuery, {})
    
    if (activeTab === 'saved') {
      filtered = filtered.filter(s => savedIds.has(s.id))
    }
    
    return filtered
  }, [scholarships, searchQuery, activeTab, savedIds])

  const renderScholarshipItem = useCallback(({ item }: { item: Scholarship }) => {
    const isSaved = savedIds.has(item.id)
    const status = savedIds.get(item.id)

    return (
      <TouchableOpacity 
        style={styles.scholarshipCard}
        onPress={() => router.push(`/scholarship/${item.id}` as Href)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.scholarshipName} numberOfLines={2}>{item.name}</Text>
          <TouchableOpacity 
            style={[styles.saveButton, isSaved && styles.saveButtonActive]}
            onPress={() => handleSaveToggle(item.id)}
          >
            <Text style={[styles.saveButtonText, isSaved && styles.saveButtonTextActive]}>
              {status === 'applied' ? 'Applied' : isSaved ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount:</Text>
            <Text style={styles.detailValue}>{item.amount}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Deadline:</Text>
            <Text style={styles.detailValue}>{formatDeadline(item.deadline)}</Text>
          </View>
          {item.state && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>State:</Text>
              <Text style={styles.detailValue}>{item.state}</Text>
            </View>
          )}
        </View>

        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.applyButton}
            onPress={() => handleApply(item.link)}
          >
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    )
  }, [savedIds, handleSaveToggle, handleApply, router])

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={ui.primary} />
        <Text style={styles.loadingText}>Loading scholarships...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Scholarships</Text>
        <Text style={styles.subtitle}>{scholarships.length} opportunities available</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search scholarships..."
          placeholderTextColor={ui.inputPlaceholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All ({scholarships.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'saved' && styles.tabActive]}
          onPress={() => setActiveTab('saved')}
        >
          <Text style={[styles.tabText, activeTab === 'saved' && styles.tabTextActive]}>
            Saved ({savedIds.size})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredScholarships}
        renderItem={renderScholarshipItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={ui.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'saved' 
                ? 'No saved scholarships yet.\nTap "Save" on any scholarship to add it here.'
                : 'No scholarships found matching your search.'}
            </Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ui.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: ui.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: ui.textSecondary,
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: ui.primary,
    borderRadius: radius.sm,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 16,
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: ui.text,
  },
  subtitle: {
    fontSize: 14,
    color: ui.textSecondary,
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchInput: {
    backgroundColor: ui.inputBackground,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 16,
    color: ui.inputText,
    borderWidth: 1,
    borderColor: ui.inputBorder,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: ui.backgroundSecondary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ui.border,
  },
  tabActive: {
    backgroundColor: ui.primary,
    borderColor: ui.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: ui.textSecondary,
  },
  tabTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  scholarshipCard: {
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  scholarshipName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: ui.text,
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: ui.backgroundSecondary,
    borderWidth: 1,
    borderColor: ui.border,
  },
  saveButtonActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  saveButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: ui.textSecondary,
  },
  saveButtonTextActive: {
    color: colors.white,
  },
  cardDetails: {
    marginTop: 12,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: ui.textMuted,
  },
  detailValue: {
    fontSize: 13,
    color: ui.text,
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  tag: {
    backgroundColor: ui.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 11,
    color: ui.primaryText,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  applyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: ui.primary,
    borderRadius: radius.sm,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: ui.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
})
