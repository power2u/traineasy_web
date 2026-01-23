'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, TextField, Label, Input, TextArea, Spinner } from '@heroui/react';
import {
    createBanner,
    updateBanner,
    activateBanner,
    deactivateBanner,
    deleteBanner,
    type MotivationBanner
} from '@/app/actions/banners';
import { toast } from 'sonner';
import { Sparkles, Plus, Edit, Trash2, Power, PowerOff } from 'lucide-react';

interface BannersClientProps {
    initialBanners: MotivationBanner[];
}

export function BannersClient({ initialBanners }: BannersClientProps) {
    const router = useRouter();
    const [banners] = useState<MotivationBanner[]>(initialBanners);
    // We can rely on router.refresh() to update the banners list, 
    // but since we are passing initialBanners as prop, React state won't auto-update unless we sync it or just use router.refresh() + key or simply full page reload.
    // Ideally, we should use `useRouter` to refresh the server component, and if we want optimistic updates or immediate feedback, we might need local state too.
    // But typically with Server Components data passing, `router.refresh()` re-renders the Server Component, which re-renders this Client Component with *new* props.
    // HOWEVER, `useState(initialBanners)` only initializes state ONCE. 
    // We need to either use `useEffect` to sync props to state, or just use props directly if we don't need local filtering that deviates from server data.
    // Actually, for simple CRUD, using `router.refresh()` and rendering from props (or derived state) is better.
    // BUT, to keep it simple and consistent with previous pages where I used `useState(initial...)`, I'll stick to that but I MUST ADD `useEffect` to update state when props change (which happens on router.refresh()).
    // OR, better yet, just use the props directly if I don't modify the list locally without server confirmation.
    // The previous pages (Packages, Memberships) used `useState` but I might have missed the syncing part if I rely solely on `router.refresh()`.
    // Let's check `PackagesClient`. I used `await loadPackages()` there, which explicitly fetches data client-side.
    // Here, I want to avoid client-side fetch if possible.
    // The `BannersPage` logic I'm replacing had `loadBanners` (client-side fetch).
    // If I use `router.refresh()`, the prop `initialBanners` will arrive with new data.
    // So I should treat `initialBanners` as the source of truth if I don't want client fetching.
    // BUT `useState` initializes only once.
    // So I will change approach: use `initialBanners` directly or use `useEffect` to sync.
    // Since `banners` is only modified by server actions, I'll use `initialBanners` as the 'current' banners if I use router.refresh().
    // But wait, `deleteBanner` etc. might need optimistic UI.
    // Let's stick to the pattern: Client Component receives initial data. 
    // If we want to refresh, we can call `router.refresh()` AND update local state, or just `router.refresh()` and let React render new props.
    // If I use `useState`, I need `useEffect` to update it when `initialBanners` changes.

    // Let's implement `useEffect` for prop sync to be safe and "correct" for this hybrid approach.
    // Or better: Just use `initialBanners` directly in render if we don't need local sorting/filtering that isn't persisted?
    // Actually, let's keep it simple: Use `useState` and `router.refresh()`. 
    // AND I'll add `useEffect` to sync state with props.
    // Wait, if I do `router.refresh()`, the page reloads effectively (without full browser reload).
    // The component re-mounts? No, it updates.
    // So `useEffect(() => setBanners(initialBanners), [initialBanners])` is needed.

    const [localBanners, setLocalBanners] = useState<MotivationBanner[]>(initialBanners);

    // Sync props to state when props change (e.g. after router.refresh())
    // This is a common pattern when mixing SSR data with client-side state.
    // However, it creates a risk of overwriting local transient state if not careful.
    // But here we don't have transient list state (like "isDeleting" per item) mixed in the list array itself.
    // So it's fine.

    // Actually, I'll use a `useEffect` to update localBanners when initialBanners changes.
    // Or I can just use `initialBanners` directly if I don't need to modify it locally before server.
    // Let's use `initialBanners` directly for rendering, and only use local state for Form inputs.
    // That's more "Server Component-ish".
    // But wait, "PackagesClient" had `loadPackages` which fetched client-side.
    // I should PROBABLY stick to that pattern for Consistency if I want to avoiding "router.refresh()" potential slowness/flicker.
    // But strictly speaking, migrating to Server Components means we SHOULD rely on Server Actions + router.refresh().
    // I will try the `router.refresh()` approach here as it's cleaner code-wise (no client-side API implementation needed in component).

    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [expiresAt, setExpiresAt] = useState('');

    const handleCreate = async () => {
        if (!title.trim() || !message.trim()) {
            toast.error('Title and message are required');
            return;
        }

        setIsCreating(true);
        const result = await createBanner(
            title.trim(),
            message.trim(),
            expiresAt || null
        );

        if (result.success) {
            toast.success('Banner created successfully');
            setTitle('');
            setMessage('');
            setExpiresAt('');
            router.refresh();
        } else {
            toast.error(result.error || 'Failed to create banner');
        }
        setIsCreating(false);
    };

    const handleUpdate = async (id: string) => {
        if (!title.trim() || !message.trim()) {
            toast.error('Title and message are required');
            return;
        }

        const result = await updateBanner(
            id,
            title.trim(),
            message.trim(),
            expiresAt || null
        );

        if (result.success) {
            toast.success('Banner updated successfully');
            setEditingId(null);
            setTitle('');
            setMessage('');
            setExpiresAt('');
            router.refresh();
        } else {
            toast.error(result.error || 'Failed to update banner');
        }
    };

    const handleActivate = async (id: string) => {
        setIsLoading(true);
        const result = await activateBanner(id);
        if (result.success) {
            toast.success('Banner activated');
            router.refresh();
        } else {
            toast.error(result.error || 'Failed to activate banner');
        }
        setIsLoading(false);
    };

    const handleDeactivate = async (id: string) => {
        setIsLoading(true);
        const result = await deactivateBanner(id);
        if (result.success) {
            toast.success('Banner deactivated');
            router.refresh();
        } else {
            toast.error(result.error || 'Failed to deactivate banner');
        }
        setIsLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this banner?')) {
            return;
        }

        setIsLoading(true);
        const result = await deleteBanner(id);
        if (result.success) {
            toast.success('Banner deleted');
            router.refresh();
        } else {
            toast.error(result.error || 'Failed to delete banner');
        }
        setIsLoading(false);
    };

    const startEdit = (banner: MotivationBanner) => {
        setEditingId(banner.id);
        setTitle(banner.title);
        setMessage(banner.message);
        setExpiresAt(banner.expires_at ? new Date(banner.expires_at).toISOString().slice(0, 16) : '');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setTitle('');
        setMessage('');
        setExpiresAt('');
    };

    const isExpired = (expiresAt: string | null) => {
        if (!expiresAt) return false;
        return new Date(expiresAt) < new Date();
    };

    return (
        <>
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-6 w-6 text-yellow-400" />
                    <h1 className="text-2xl font-bold">Motivation Banners</h1>
                </div>
                <p className="text-sm text-default-500">
                    Manage motivational quotes and messages displayed to users
                </p>
            </div>

            {/* Create/Edit Form */}
            <Card className="p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">
                    {editingId ? 'Edit Banner' : 'Create New Banner'}
                </h2>
                <div className="space-y-4">
                    <TextField value={title} onChange={setTitle} isRequired>
                        <Label>Title</Label>
                        <Input placeholder="e.g., Daily Motivation" />
                    </TextField>

                    <TextField value={message} onChange={setMessage} isRequired>
                        <Label>Message</Label>
                        <TextArea
                            placeholder="e.g., You're doing great! Keep pushing towards your goals!"
                            rows={3}
                        />
                    </TextField>

                    <TextField value={expiresAt} onChange={setExpiresAt}>
                        <Label>Expires At (Optional)</Label>
                        <Input type="datetime-local" />
                    </TextField>

                    <div className="flex gap-3">
                        {editingId ? (
                            <>
                                <Button
                                    variant="primary"
                                    onPress={() => handleUpdate(editingId)}
                                >
                                    Update Banner
                                </Button>
                                <Button
                                    variant="secondary"
                                    onPress={cancelEdit}
                                >
                                    Cancel
                                </Button>
                            </>
                        ) : (
                            <Button
                                variant="primary"
                                onPress={handleCreate}
                                isDisabled={isCreating}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                {isCreating ? 'Creating...' : 'Create Banner'}
                            </Button>
                        )}
                    </div>
                </div>
            </Card>

            {/* Banners List */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">All Banners</h2>

                {isLoading && (
                    <div className="fixed inset-0 bg-black/10 z-50 flex items-center justify-center pointer-events-none">
                        <Spinner size="lg" />
                    </div>
                )}

                {initialBanners.length === 0 ? (
                    <Card className="p-12 text-center">
                        <Sparkles className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-gray-400">No banners yet. Create your first one!</p>
                    </Card>
                ) : (
                    initialBanners.map((banner) => (
                        <Card
                            key={banner.id}
                            className={`p-4 ${banner.is_active ? 'border-2 border-green-500' : ''}`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-lg font-semibold">{banner.title}</h3>
                                        {banner.is_active && (
                                            <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 rounded">
                                                ACTIVE
                                            </span>
                                        )}
                                        {isExpired(banner.expires_at) && (
                                            <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded">
                                                EXPIRED
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-300 mb-2">{banner.message}</p>
                                    <div className="flex gap-4 text-xs text-gray-500">
                                        <span>Created: {new Date(banner.created_at).toLocaleDateString()}</span>
                                        {banner.expires_at && (
                                            <span>Expires: {new Date(banner.expires_at).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {banner.is_active ? (
                                        <Button
                                            variant="danger-soft"
                                            size="sm"
                                            onPress={() => handleDeactivate(banner.id)}
                                        >
                                            <PowerOff className="h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onPress={() => handleActivate(banner.id)}
                                        >
                                            <Power className="h-4 w-4" />
                                        </Button>
                                    )}

                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onPress={() => startEdit(banner)}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>

                                    <Button
                                        variant="danger-soft"
                                        size="sm"
                                        onPress={() => handleDelete(banner.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </>
    );
}
