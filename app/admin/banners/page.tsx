<<<<<<< HEAD
'use client';

import { useEffect, useState } from 'react';
import { Button, Card, TextField, Label, Input, TextArea, Spinner } from '@heroui/react';
import { 
  getAllBanners, 
  createBanner, 
  updateBanner, 
  activateBanner, 
  deactivateBanner, 
  deleteBanner,
  type MotivationBanner 
} from '@/app/actions/banners';
import { toast } from 'sonner';
import { Sparkles, Plus, Edit, Trash2, Power, PowerOff } from 'lucide-react';

export default function BannersAdminPage() {
  const [banners, setBanners] = useState<MotivationBanner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    setIsLoading(true);
    const result = await getAllBanners();
    if (result.success) {
      setBanners(result.banners);
    } else {
      toast.error('Failed to load banners');
    }
    setIsLoading(false);
  };

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
      loadBanners();
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
      loadBanners();
    } else {
      toast.error(result.error || 'Failed to update banner');
    }
  };

  const handleActivate = async (id: string) => {
    const result = await activateBanner(id);
    if (result.success) {
      toast.success('Banner activated');
      loadBanners();
    } else {
      toast.error(result.error || 'Failed to activate banner');
    }
  };

  const handleDeactivate = async (id: string) => {
    const result = await deactivateBanner(id);
    if (result.success) {
      toast.success('Banner deactivated');
      loadBanners();
    } else {
      toast.error(result.error || 'Failed to deactivate banner');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) {
      return;
    }

    const result = await deleteBanner(id);
    if (result.success) {
      toast.success('Banner deleted');
      loadBanners();
    } else {
      toast.error(result.error || 'Failed to delete banner');
    }
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
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : banners.length === 0 ? (
          <Card className="p-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-400">No banners yet. Create your first one!</p>
          </Card>
        ) : (
          banners.map((banner) => (
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
=======
'use client';

import { useEffect, useState } from 'react';
import { Button, Card, TextField, Label, Input, TextArea, Spinner } from '@heroui/react';
import { 
  getAllBanners, 
  createBanner, 
  updateBanner, 
  activateBanner, 
  deactivateBanner, 
  deleteBanner,
  type MotivationBanner 
} from '@/app/actions/banners';
import { toast } from 'sonner';
import { Sparkles, Plus, Edit, Trash2, Power, PowerOff } from 'lucide-react';

export default function BannersAdminPage() {
  const [banners, setBanners] = useState<MotivationBanner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    setIsLoading(true);
    const result = await getAllBanners();
    if (result.success) {
      setBanners(result.banners);
    } else {
      toast.error('Failed to load banners');
    }
    setIsLoading(false);
  };

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
      loadBanners();
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
      loadBanners();
    } else {
      toast.error(result.error || 'Failed to update banner');
    }
  };

  const handleActivate = async (id: string) => {
    const result = await activateBanner(id);
    if (result.success) {
      toast.success('Banner activated');
      loadBanners();
    } else {
      toast.error(result.error || 'Failed to activate banner');
    }
  };

  const handleDeactivate = async (id: string) => {
    const result = await deactivateBanner(id);
    if (result.success) {
      toast.success('Banner deactivated');
      loadBanners();
    } else {
      toast.error(result.error || 'Failed to deactivate banner');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) {
      return;
    }

    const result = await deleteBanner(id);
    if (result.success) {
      toast.success('Banner deleted');
      loadBanners();
    } else {
      toast.error(result.error || 'Failed to delete banner');
    }
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
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : banners.length === 0 ? (
          <Card className="p-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-400">No banners yet. Create your first one!</p>
          </Card>
        ) : (
          banners.map((banner) => (
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
>>>>>>> main
