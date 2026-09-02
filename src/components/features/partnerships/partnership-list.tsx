'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Heart, Trash2, Edit, User, UserRound } from 'lucide-react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Partnership, Person } from '@/types'
import { PartnershipForm } from './partnership-form'
import { useAuthStore } from '@/store/auth'

export default function PartnershipList() {
  const [formOpen, setFormOpen] = useState(false)
  const [editPartnership, setEditPartnership] = useState<Partnership | undefined>()
  const { hasPermission } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: partnerships, isLoading } = useQuery({
    queryKey: ['partnerships'],
    queryFn: async () => {
      const res = await fetch('/api/partnerships')
      if (!res.ok) throw new Error('Gagal memuat data pernikahan')
      return res.json() as Promise<Partnership[]>
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/partnerships/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error('Gagal menghapus pernikahan')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerships'] })
      queryClient.invalidateQueries({ queryKey: ['tree'] })
      queryClient.invalidateQueries({ queryKey: ['persons'] })
      toast.success('Pernikahan berhasil dihapus')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleEdit = (p: Partnership) => {
    setEditPartnership(p)
    setFormOpen(true)
  }

  const handleFormClose = (open: boolean) => {
    setFormOpen(open)
    if (!open) setEditPartnership(undefined)
  }

  const formatDate = (d: string | null) => {
    if (!d) return '-'
    try { return format(new Date(d), 'dd MMMM yyyy', { locale: localeId }) } catch { return d }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse"><CardContent className="p-6 h-32" /></Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Data Pernikahan</h2>
          <p className="text-sm text-muted-foreground">
            {partnerships?.length ?? 0} pernikahan tercatat
          </p>
        </div>
        {hasPermission('create_marriage') && (
          <Button onClick={() => setFormOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Tambah
          </Button>
        )}
      </div>

      {!partnerships?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Heart className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Belum ada data pernikahan</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {partnerships.map((p) => (
            <Card key={p.id} className={p.divorce_date ? 'opacity-70' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Heart className="h-4 w-4 text-rose-500" />
                    Pernikahan
                  </CardTitle>
                  {p.divorce_date ? (
                    <Badge variant="secondary" className="text-xs">Cerai</Badge>
                  ) : (
                    <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Aktif</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <div className={`w-8 h-8 rounded-full border-2 border-background flex items-center justify-center ${p.person1?.jenis_kelamin === 'P' ? 'bg-rose-100 dark:bg-rose-950' : 'bg-sky-100 dark:bg-sky-950'}`}>
                      {p.person1?.jenis_kelamin === 'P' ? <UserRound className="h-3.5 w-3.5 text-rose-500" /> : <User className="h-3.5 w-3.5 text-sky-500" />}
                    </div>
                    <div className={`w-8 h-8 rounded-full border-2 border-background flex items-center justify-center ${p.person2?.jenis_kelamin === 'P' ? 'bg-rose-100 dark:bg-rose-950' : 'bg-sky-100 dark:bg-sky-950'}`}>
                      {p.person2?.jenis_kelamin === 'P' ? <UserRound className="h-3.5 w-3.5 text-rose-500" /> : <User className="h-3.5 w-3.5 text-sky-500" />}
                    </div>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">{p.person1?.nama_panggilan || p.person1?.nama || '-'}</p>
                    <p className="text-muted-foreground">&</p>
                    <p className="font-medium">{p.person2?.nama_panggilan || p.person2?.nama || '-'}</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Nikah: {formatDate(p.marriage_date)}</p>
                  {p.divorce_date && <p>Cerai: {formatDate(p.divorce_date)}</p>}
                </div>
                {hasPermission('edit_marriage') && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleEdit(p)}>
                      <Edit className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive">
                          <Trash2 className="h-3 w-3 mr-1" /> Hapus
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus Pernikahan?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Data pernikahan antara {p.person1?.nama} dan {p.person2?.nama} akan dihapus permanen.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(p.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PartnershipForm
        partnership={editPartnership}
        open={formOpen}
        onOpenChange={handleFormClose}
      />
    </div>
  )
}
