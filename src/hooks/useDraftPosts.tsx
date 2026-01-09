import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface DraftPost {
  id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useDraftPosts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<DraftPost[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDrafts = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('draft_posts')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching drafts:', error);
    } else {
      setDrafts(data || []);
    }
    setLoading(false);
  };

  const saveDraft = async (content: string, imageUrl: string | null = null, draftId?: string) => {
    if (!user) return null;

    if (draftId) {
      // Update existing draft
      const { data, error } = await supabase
        .from('draft_posts')
        .update({ content, image_url: imageUrl })
        .eq('id', draftId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        toast({ title: 'Failed to save draft', variant: 'destructive' });
        return null;
      }
      
      toast({ title: 'Draft saved!' });
      return data;
    } else {
      // Create new draft
      const { data, error } = await supabase
        .from('draft_posts')
        .insert({ user_id: user.id, content, image_url: imageUrl })
        .select()
        .single();

      if (error) {
        toast({ title: 'Failed to save draft', variant: 'destructive' });
        return null;
      }
      
      toast({ title: 'Draft saved!' });
      return data;
    }
  };

  const deleteDraft = async (draftId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('draft_posts')
      .delete()
      .eq('id', draftId)
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'Failed to delete draft', variant: 'destructive' });
      return false;
    }

    setDrafts(drafts.filter(d => d.id !== draftId));
    toast({ title: 'Draft deleted' });
    return true;
  };

  useEffect(() => {
    if (user) {
      fetchDrafts();
    }
  }, [user]);

  return {
    drafts,
    loading,
    saveDraft,
    deleteDraft,
    fetchDrafts,
  };
}
