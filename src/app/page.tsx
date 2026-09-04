'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TreePine, Search, Users, Heart, Settings, LogOut, LogIn,
  Sun, Moon, UserPlus, Menu, X, Download, UserCircle, BarChart3, BookOpen,
  Library, ArrowRightLeft
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

import TreeView from '@/components/features/tree/tree-view'
import { SearchPanel } from '@/components/features/search/search-panel'
import { ProfilePanel } from '@/components/features/profile/profile-panel'
import PartnershipList from '@/components/features/partnerships/partnership-list'
import { ExportDialog } from '@/components/features/export/export-dialog'
import { HeritagePanel } from '@/components/features/heritage/heritage-panel'
import { LoginForm } from '@/components/features/auth/login-form'
import { AdatGuideDialog } from '@/components/features/adat/adat-guide-dialog'
import { useAuthStore } from '@/store/auth'
import type { TreeNode } from '@/types'

// Code-splitting (audit T-05): panel berat dimuat malas lewat next/dynamic
// sehingga recharts (statistik), jsPDF pipeline (transfer), dan kode admin
// tidak lagi membebani bundel awal halaman pohon.
const StatisticsPanel = dynamic(
  () => import('@/components/features/statistics/statistics-panel').then(m => m.StatisticsPanel),
  { loading: () => <PanelLoading /> },
)
const TransferPanel = dynamic(
  () => import('@/components/features/transfer/transfer-panel').then(m => m.TransferPanel),
  { loading: () => <PanelLoading /> },
)
const RBACPanel = dynamic(
  () => import('@/components/features/admin/rbac-panel').then(m => m.RBACPanel),
  { loading: () => <PanelLoading /> },
)
const UserManagement = dynamic(
  () => import('@/components/features/admin/user-management').then(m => m.UserManagement),
  { loading: () => <PanelLoading /> },
)
const MargaBookPanel = dynamic(
  () => import('@/components/features/marga-book/marga-book-panel').then(m => m.MargaBookPanel),
  { loading: () => <PanelLoading /> },
)

function PanelLoading() {
  return (
    <div className='flex items-center justify-center py-24' aria-busy='true' aria-label='Memuat panel'>
      <div className='text-center space-y-3'>
        <Skeleton className='h-8 w-56 mx-auto' />
        <Skeleton className='h-4 w-40 mx-auto' />
        <p className='text-sm text-muted-foreground'>Memuat...</p>
      </div>
    </div>
  )
}

type TabValue = 'tree' | 'search' | 'profile' | 'bagan' | 'pernikahan' | 'warisan' | 'bukumarga' | 'transfer' | 'statistik' | 'admin'

function AdminPanel() {
  const [section, setSection] = useState<'users' | 'perms'>('users')
  return (
    <div className='space-y-6'>
      <div className='flex gap-2'>
        <Button variant={section === 'users' ? 'secondary' : 'ghost'} size='sm' onClick={() => setSection('users')}>Kelola Pengguna</Button>
        <Button variant={section === 'perms' ? 'secondary' : 'ghost'} size='sm' onClick={() => setSection('perms')}>Kelola Hak Akses</Button>
      </div>
      {section === 'users' ? <UserManagement /> : <RBACPanel />}
    </div>
  )
}

export default function Home() {
  const { user, hasPermission, logout } = useAuthStore()
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<TabValue>('tree')
  const [showLogin, setShowLogin] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [treePersonId, setTreePersonId] = useState<string | null>(null)
  const [treeNavKey, setTreeNavKey] = useState(0)
  const queryClient = useQueryClient()

  // Determine available tabs based on permissions
  const tabs: { value: TabValue; label: string; icon: React.ReactNode; permission?: string }[] = []

  // Hardening: seluruh tab mensyaratkan izin — pengguna belum login
  // tidak melihat data keluarga sama sekali.
  if (hasPermission('view_tree')) {
    tabs.push({ value: 'tree', label: 'Pohon Keluarga', icon: <TreePine className='h-4 w-4' />, permission: 'view_tree' })
  }
  if (hasPermission('search')) {
    tabs.push({ value: 'search', label: 'Cari', icon: <Search className='h-4 w-4' />, permission: 'search' })
  }

  if (hasPermission('view_profile')) {
    tabs.push({ value: 'profile', label: 'Profil', icon: <Users className='h-4 w-4' /> })
  }
  if (hasPermission('view_bagans')) {
    tabs.push({ value: 'bagan', label: 'Bagan Keluarga', icon: <UserCircle className='h-4 w-4' /> })
  }
  if (hasPermission('view_marriages')) {
    tabs.push({ value: 'pernikahan', label: 'Pernikahan', icon: <Heart className='h-4 w-4' /> })
  }
  if (hasPermission('view_heritage')) {
    tabs.push({ value: 'warisan', label: 'Warisan Budaya', icon: <BookOpen className='h-4 w-4' /> })
  }
  if (hasPermission('view_marga_book')) {
    tabs.push({ value: 'bukumarga', label: 'Buku Marga', icon: <Library className='h-4 w-4' /> })
  }
  if (hasPermission('transfer_data')) {
    tabs.push({ value: 'transfer', label: 'Transfer', icon: <ArrowRightLeft className='h-4 w-4' /> })
  }
  if (hasPermission('view_marriages')) {
    tabs.push({ value: 'statistik', label: 'Statistik', icon: <BarChart3 className='h-4 w-4' /> })
  }
  if (hasPermission('view_admin')) {
    tabs.push({ value: 'admin', label: 'Admin', icon: <Settings className='h-4 w-4' /> })
  }

  // Compute valid active tab
  const validTab = tabs.find(t => t.value === activeTab) ? activeTab : (tabs[0]?.value || 'tree')
  const effectiveTab = validTab as TabValue

  // Fetch tree data
  const { data: treeData, isLoading: treeLoading } = useQuery<TreeNode[]>({
    queryKey: ['tree'],
    queryFn: async () => {
      const res = await fetch('/api/tree')
      if (!res.ok) throw new Error('Gagal memuat data pohon')
      return res.json()
    },
    staleTime: 30000,
  })

  const handleLoginSuccess = useCallback(() => {
    setShowLogin(false)
    queryClient.invalidateQueries()
  }, [queryClient])

  // Callback node pohon STABIL (audit T-05b): identitas fungsi tidak berubah
  // antar render Home — TreeView yang di-memo tidak lagi rebuild DOM penuh
  // hanya karena tab berganti / menu dibuka / state lain berubah.
  const handleTreeNodeClick = useCallback((id: string) => {
    setTreePersonId(id)
    setTreeNavKey((k) => k + 1)
    if (hasPermission('view_profile')) {
      setActiveTab('profile')
    } else {
      setActiveTab('search')
    }
  }, [hasPermission])

  const handleLogout = useCallback(() => {
    logout()
    queryClient.invalidateQueries()
    setActiveTab('tree')
  }, [logout, queryClient])

  // Catatan (audit S-04): POST /api/seed TIDAK lagi ditembak dari setiap
  // page load. Seeding adalah urusan deploy (sekali saat instalasi) dan
  // sudah didokumentasikan di docs/DEPLOYMENT.md — bukan urusan peramban.

  const tabContent = () => {
    switch (effectiveTab) {
      case 'tree':
        if (treeLoading) {
          return (
            <div className='flex items-center justify-center h-full'>
              <div className='text-center space-y-3'>
                <Skeleton className='h-8 w-48 mx-auto' />
                <Skeleton className='h-4 w-32 mx-auto' />
                <p className='text-sm text-muted-foreground'>Memuat pohon keluarga...</p>
              </div>
            </div>
          )
        }
        return (
          <div id='tree-svg-container' className='w-full h-[calc(100vh-180px)] relative'>
            <TreeView data={treeData || []} onNodeClick={handleTreeNodeClick} />
          </div>
        )

      case 'search':
        return <SearchPanel key={treeNavKey} initialPersonId={treePersonId} />

      case 'profile':
        return <ProfilePanel key={treeNavKey} initialPersonId={treePersonId} />

      case 'bagan':
        return <ProfilePanel />

      case 'pernikahan':
        return <PartnershipList />

      case 'warisan':
        return <HeritagePanel />

      case 'bukumarga':
        return <MargaBookPanel />

      case 'transfer':
        return <TransferPanel />

      case 'statistik':
        return <StatisticsPanel />

      case 'admin':
        return <AdminPanel />

      default:
        return null
    }
  }

  return (
    <div className='min-h-screen flex flex-col bg-background page-bg'>
      {/* Login Overlay */}
      <AnimatePresence>
        {showLogin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 z-50 bg-background/80 backdrop-blur-sm'
          >
            <LoginForm onSuccess={handleLoginSuccess} />
            <div className='absolute top-4 right-4'>
              <Button variant='ghost' size='icon' onClick={() => setShowLogin(false)} aria-label='Tutup form masuk'>
                <X className='h-5 w-5' />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className='sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
        <div className='max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between gap-4'>
          {/* Logo + Title */}
          <div className='flex items-center gap-2.5 min-w-0'>
            <img
              src='/tarombo-bg02.png'
              alt='Tarombo'
              className='w-8 h-8 rounded-md object-cover flex-shrink-0'
            />
            <div className='min-w-0'>
              <h1 className='text-sm font-bold leading-tight truncate'>Tarombo Hariandja</h1>
              <p className='text-[10px] text-muted-foreground leading-tight hidden sm:block'>Pohon Keluarga Marga Hariandja</p>
            </div>
          </div>

          {/* Desktop Tabs */}
          <nav className='hidden md:flex items-center'>
            <Tabs value={effectiveTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
              <TabsList className='h-9'>
                {tabs.map(tab => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className='text-xs px-3 gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'
                  >
                    {tab.icon}
                    <span className='hidden lg:inline'>{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </nav>

          {/* Right Actions */}
          <div className='flex items-center gap-1.5 flex-shrink-0'>
            {/* Panduan Adat (Batak customary-law guide) */}
            <AdatGuideDialog />

            {hasPermission('export') && effectiveTab === 'tree' && (
              <ExportDialog />
            )}

            {/* Theme Toggle */}
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8'
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label='Ganti tema terang/gelap'
            >
              <Sun className='h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0' />
              <Moon className='absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100' />
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='ghost' size='sm' className='gap-1.5 h-8'>
                    <Avatar className='h-6 w-6'>
                      <AvatarFallback className='text-[10px] bg-primary/10 text-primary'>
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className='hidden sm:inline text-xs max-w-24 truncate'>{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-48'>
                  <div className='px-2 py-1.5'>
                    <p className='text-sm font-medium'>{user.name}</p>
                    <p className='text-xs text-muted-foreground'>{user.email}</p>
                    <Badge variant='secondary' className='text-[10px] mt-1'>{user.role}</Badge>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className='text-destructive'>
                    <LogOut className='h-4 w-4 mr-2' /> Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant='default' size='sm' className='h-8 gap-1.5' onClick={() => setShowLogin(true)}>
                <LogIn className='h-3.5 w-3.5' />
                <span className='hidden sm:inline text-xs'>Masuk</span>
              </Button>
            )}

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className='md:hidden'>
                <Button variant='ghost' size='icon' className='h-8 w-8' aria-label='Buka menu navigasi'>
                  <Menu className='h-4 w-4' />
                </Button>
              </SheetTrigger>
              <SheetContent side='right' className='w-64'>
                <nav className='flex flex-col gap-1 mt-8'>
                  {tabs.map(tab => (
                    <Button
                      key={tab.value}
                      variant={effectiveTab === tab.value ? 'secondary' : 'ghost'}
                      className='justify-start gap-2 h-10'
                      onClick={() => { setActiveTab(tab.value as TabValue); setMobileMenuOpen(false) }}
                    >
                      {tab.icon}
                      {tab.label}
                    </Button>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Mobile Tab Bar */}
        <div className='md:hidden border-t'>
          <div className='flex overflow-x-auto px-2 gap-1 py-1.5 scrollbar-none'>
            {tabs.map(tab => (
              <Button
                key={tab.value}
                variant={effectiveTab === tab.value ? 'secondary' : 'ghost'}
                size='sm'
                className='flex-shrink-0 gap-1 h-8 text-xs px-2.5'
                onClick={() => setActiveTab(tab.value as TabValue)}
              >
                {tab.icon}
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content — pengguna belum login hanya melihat form masuk */}
      <main className='flex-1 max-w-screen-2xl mx-auto w-full px-4 py-4'>
        {!user ? (
          <div className='flex min-h-[calc(100vh-180px)] items-center justify-center'>
            <LoginForm onSuccess={handleLoginSuccess} />
          </div>
        ) : (
          tabContent()
        )}
      </main>

      {/* Footer */}
      <footer className='border-t mt-auto'>
        <div className='max-w-screen-2xl mx-auto px-4 h-10 flex items-center justify-between text-xs text-muted-foreground'>
          <span>Tarombo Marga Hariandja</span>
          <span className='hidden sm:inline-flex items-center gap-2'>
            <span className='font-medium text-foreground/60'>Hasangapon</span>
            <span className='text-foreground/30'>·</span>
            <span className='font-medium text-foreground/60'>Hagabeon</span>
            <span className='text-foreground/30'>·</span>
            <span className='font-medium text-foreground/60'>Hamoraon</span>
          </span>
          <span className='hidden sm:inline'>Turian · Pusaka · Tarombo</span>
        </div>
      </footer>
    </div>
  )
}
