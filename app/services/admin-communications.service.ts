/**
 * Admin Communications Service
 * Manage emails, SMS, announcements, news, and push notifications
 */

import { requireAdmin } from '../middleware/admin.middleware';

// ============================================
// NOTIFICATIONS (PUSH & IN-APP)
// ============================================

export const getUserNotifications = async (limit: number = 100) => {
  try {
        // Verify admin access
    await requireAdmin();

const { data, error } = await supabase
      .from('notifications')
      .select(`
        id,
        user_id,
        title,
        message,
        type,
        is_read,
        created_at,
        users!inner (
          email,
          full_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Get notifications error:', error);
    return [];
  }
};

export const sendBulkNotification = async (data: {
  title: string;
  message: string;
  type?: string;
  targetUsers: 'all' | 'active' | 'inactive';
}) => {
  try {
        // Verify admin access
    await requireAdmin();

// Get target users
    let query = supabase.from('users').select('id');

    if (data.targetUsers === 'active') {
      query = query.eq('is_active', true);
    } else if (data.targetUsers === 'inactive') {
      query = query.eq('is_active', false);
    }

    const { data: users, error: usersError } = await query;
    if (usersError) throw usersError;

    if (!users || users.length === 0) {
      throw new Error('No target users found');
    }

    // Create notifications for all users
    const notifications = users.map((user) => ({
      user_id: user.id,
      title: data.title,
      message: data.message,
      type: data.type || 'announcement',
      is_read: false,
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) throw insertError;

    return {
      success: true,
      recipients: users.length,
    };
  } catch (error: any) {
    console.error('Send bulk notification error:', error);
    throw new Error(error.message || 'Failed to send bulk notification');
  }
};

// ============================================
// EMAIL HISTORY (Using Transactions as Proxy)
// ============================================

export const getEmailHistory = async () => {
  try {
        // Verify admin access
    await requireAdmin();

// Since there's no email_history table, we'll return mock data
    // In production, you'd integrate with an email service like SendGrid
    return [
      {
        id: '1',
        subject: 'Welcome to Finaster MLM Platform',
        recipients: 0,
        sentDate: new Date().toISOString(),
        opened: 0,
        clicked: 0,
        status: 'draft' as const,
      },
    ];
  } catch (error: any) {
    console.error('Get email history error:', error);
    return [];
  }
};

export const sendBulkEmail = async (data: {
  subject: string;
  body: string;
  recipients: 'all' | 'verified' | 'unverified';
  schedule?: string;
}) => {
  try {
        // Verify admin access
    await requireAdmin();

// Get target users
    let query = supabase.from('users').select('id, email, full_name');

    if (data.recipients === 'verified') {
      query = query.eq('kyc_status', 'approved');
    } else if (data.recipients === 'unverified') {
      query = query.neq('kyc_status', 'approved');
    }

    const { data: users, error: usersError } = await query;
    if (usersError) throw usersError;

    if (!users || users.length === 0) {
      throw new Error('No target users found');
    }

    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    // For now, create notification records
    const notifications = users.map((user) => ({
      user_id: user.id,
      title: data.subject,
      message: data.body,
      type: 'email',
      is_read: false,
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) throw insertError;

    return {
      success: true,
      recipients: users.length,
      message: `Email queued for ${users.length} recipients`,
    };
  } catch (error: any) {
    console.error('Send bulk email error:', error);
    throw new Error(error.message || 'Failed to send bulk email');
  }
};

// ============================================
// SMS (Using Notifications as Proxy)
// ============================================

export const sendBulkSMS = async (data: {
  message: string;
  recipients: 'all' | 'verified' | 'active';
}) => {
  try {
        // Verify admin access
    await requireAdmin();

// Get target users
    let query = supabase.from('users').select('id, phone');

    if (data.recipients === 'verified') {
      query = query.eq('kyc_status', 'approved');
    } else if (data.recipients === 'active') {
      query = query.eq('is_active', true);
    }

    const { data: users, error: usersError } = await query;
    if (usersError) throw usersError;

    // Filter users with phone numbers
    const usersWithPhone = users?.filter((u) => u.phone) || [];

    if (usersWithPhone.length === 0) {
      throw new Error('No users with phone numbers found');
    }

    // In production, integrate with SMS service (Twilio, AWS SNS, etc.)
    // For now, create notification records
    const notifications = usersWithPhone.map((user) => ({
      user_id: user.id,
      title: 'SMS Notification',
      message: data.message,
      type: 'sms',
      is_read: false,
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) throw insertError;

    return {
      success: true,
      recipients: usersWithPhone.length,
      creditsUsed: usersWithPhone.length, // 1 credit per SMS
    };
  } catch (error: any) {
    console.error('Send bulk SMS error:', error);
    throw new Error(error.message || 'Failed to send bulk SMS');
  }
};

// ============================================
// ANNOUNCEMENTS
// ============================================

export interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'info' | 'warning' | 'urgent';
  display_location: 'banner' | 'popup';
  target_users: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'scheduled' | 'expired';
  created_at?: string;
  updated_at?: string;
}

export const getAnnouncements = async () => {
  try {
        // Verify admin access
    await requireAdmin();

// Check if announcements table exists
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .like('setting_key', 'announcement_%')
      .limit(10);

    // If no announcements in system_settings, return empty
    // In production, you'd create a dedicated announcements table
    if (error) {
      console.warn('Announcements table may not exist:', error);
      return [];
    }

    return [];
  } catch (error: any) {
    console.error('Get announcements error:', error);
    return [];
  }
};

export const createAnnouncement = async (announcement: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>) => {
  try {
        // Verify admin access
    await requireAdmin();

// Store as system setting (temporary solution)
    // In production, create a dedicated announcements table
    const announcementId = `announcement_${Date.now()}`;

    const { error } = await supabase
      .from('system_settings')
      .insert({
        setting_key: announcementId,
        setting_value: JSON.stringify(announcement),
        category: 'announcements',
        description: announcement.title,
      });

    if (error) throw error;

    // Also create notifications for all users
    const notificationData = {
      title: announcement.title,
      message: announcement.message,
      type: `announcement_${announcement.priority}`,
      targetUsers: 'all' as const,
    };

    await sendBulkNotification(notificationData);

    return {
      success: true,
      id: announcementId,
    };
  } catch (error: any) {
    console.error('Create announcement error:', error);
    throw new Error(error.message || 'Failed to create announcement');
  }
};

export const deleteAnnouncement = async (id: string) => {
  try {
        // Verify admin access
    await requireAdmin();

const { error } = await supabase
      .from('system_settings')
      .delete()
      .eq('setting_key', id);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Delete announcement error:', error);
    throw new Error(error.message || 'Failed to delete announcement');
  }
};

// ============================================
// NEWS/BLOG ARTICLES
// ============================================

export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  featured_image?: string;
  author: string;
  publish_date: string;
  status: 'published' | 'draft';
  views: number;
  created_at?: string;
  updated_at?: string;
}

export const getNewsArticles = async () => {
  try {
        // Verify admin access
    await requireAdmin();

// Check if news_articles table exists
    // In production, create a dedicated news_articles table
    // For now, return empty array
    return [];
  } catch (error: any) {
    console.error('Get news articles error:', error);
    return [];
  }
};

export const createNewsArticle = async (article: Omit<NewsArticle, 'id' | 'views' | 'created_at' | 'updated_at'>) => {
  try {
        // Verify admin access
    await requireAdmin();

// Store as system setting (temporary solution)
    const articleId = `news_${Date.now()}`;

    const { error } = await supabase
      .from('system_settings')
      .insert({
        setting_key: articleId,
        setting_value: JSON.stringify(article),
        category: 'news',
        description: article.title,
      });

    if (error) throw error;

    return {
      success: true,
      id: articleId,
    };
  } catch (error: any) {
    console.error('Create news article error:', error);
    throw new Error(error.message || 'Failed to create news article');
  }
};

export const updateNewsArticle = async (id: string, article: Partial<NewsArticle>) => {
  try {
        // Verify admin access
    await requireAdmin();

const { error } = await supabase
      .from('system_settings')
      .update({
        setting_value: JSON.stringify(article),
        updated_at: new Date().toISOString(),
      })
      .eq('setting_key', id);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Update news article error:', error);
    throw new Error(error.message || 'Failed to update news article');
  }
};

export const deleteNewsArticle = async (id: string) => {
  try {
        // Verify admin access
    await requireAdmin();

const { error } = await supabase
      .from('system_settings')
      .delete()
      .eq('setting_key', id);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Delete news article error:', error);
    throw new Error(error.message || 'Failed to delete news article');
  }
};

// ============================================
// STATISTICS
// ============================================

export const getCommunicationsStats = async () => {
  try {
        // Verify admin access
    await requireAdmin();

// Get total users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get verified users
    const { count: verifiedUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('kyc_status', 'approved');

    // Get active users
    const { count: activeUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get total notifications sent (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: notificationsSent } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    return {
      totalUsers: totalUsers || 0,
      verifiedUsers: verifiedUsers || 0,
      activeUsers: activeUsers || 0,
      notificationsSent: notificationsSent || 0,
      smsCreditsBalance: 15000, // Mock data - integrate with SMS provider
    };
  } catch (error: any) {
    console.error('Get communications stats error:', error);
    return {
      totalUsers: 0,
      verifiedUsers: 0,
      activeUsers: 0,
      notificationsSent: 0,
      smsCreditsBalance: 0,
    };
  }
};
