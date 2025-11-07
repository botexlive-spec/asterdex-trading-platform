/**
 * Admin Support Service
 * Handles all support ticket and live chat operations
 */

import { requireAdmin } from '../middleware/admin.middleware';

// Types
export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketCategory = 'technical' | 'billing' | 'account' | 'general' | 'kyc' | 'withdrawal';
export type ChatStatus = 'active' | 'waiting' | 'closed';

export interface Ticket {
  id: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  userId: string;
  userName: string;
  userEmail: string;
  assignedTo?: string;
  assignedToName?: string;
  createdAt: Date;
  updatedAt: Date;
  lastReplyAt: Date;
  messagesCount: number;
  isRead: boolean;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'admin';
  message: string;
  isInternal: boolean;
  createdAt: Date;
  attachments?: string[];
}

export interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: string;
  shortcut?: string;
  usageCount: number;
  createdAt: Date;
}

export interface ChatSession {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: ChatStatus;
  assignedTo?: string;
  assignedToName?: string;
  startedAt: Date;
  lastMessageAt: Date;
  messagesCount: number;
  waitingTime: number;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'admin';
  message: string;
  createdAt: Date;
}

/**
 * Get all support tickets with optional filters
 */
export const getSupportTickets = async (filters?: {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assignedTo?: string;
}): Promise<Ticket[]> => {
  try {
    await requireAdmin();

    let query = supabase
      .from('support_tickets')
      .select(`
        *,
        user:users!user_id(full_name, email),
        assigned_admin:users!assigned_to(full_name)
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform database response to match Ticket interface
    return (data || []).map(ticket => ({
      id: ticket.ticket_id || ticket.id,
      subject: ticket.subject,
      category: ticket.category as TicketCategory,
      priority: ticket.priority as TicketPriority,
      status: ticket.status as TicketStatus,
      userId: ticket.user_id,
      userName: ticket.user?.full_name || 'Unknown User',
      userEmail: ticket.user?.email || '',
      assignedTo: ticket.assigned_to,
      assignedToName: ticket.assigned_admin?.full_name,
      createdAt: new Date(ticket.created_at),
      updatedAt: new Date(ticket.updated_at),
      lastReplyAt: new Date(ticket.last_reply_at || ticket.updated_at),
      messagesCount: ticket.messages_count || 0,
      isRead: ticket.is_read || false,
    }));
  } catch (error: any) {
    console.error('Get support tickets error:', error);
    throw new Error(error.message || 'Failed to fetch support tickets');
  }
};

/**
 * Get messages for a specific ticket
 */
export const getTicketMessages = async (ticketId: string): Promise<TicketMessage[]> => {
  try {
    await requireAdmin();

    const { data, error } = await supabase
      .from('ticket_messages')
      .select(`
        *,
        sender:users!sender_id(full_name, role)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(msg => ({
      id: msg.id,
      ticketId: msg.ticket_id,
      senderId: msg.sender_id,
      senderName: msg.sender?.full_name || 'Unknown',
      senderRole: msg.sender?.role === 'admin' ? 'admin' : 'user',
      message: msg.message,
      isInternal: msg.is_internal || false,
      createdAt: new Date(msg.created_at),
      attachments: msg.attachments,
    }));
  } catch (error: any) {
    console.error('Get ticket messages error:', error);
    throw new Error(error.message || 'Failed to fetch ticket messages');
  }
};

/**
 * Create a new ticket message (reply or internal note)
 */
export const createTicketMessage = async (
  ticketId: string,
  message: string,
  isInternal: boolean = false
): Promise<TicketMessage> => {
  try {
    await requireAdmin();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: user.id,
        message,
        is_internal: isInternal,
      })
      .select(`
        *,
        sender:users!sender_id(full_name, role)
      `)
      .single();

    if (error) throw error;

    // Update ticket's last_reply_at and messages_count
    await supabase
      .from('support_tickets')
      .update({
        last_reply_at: new Date().toISOString(),
        messages_count: supabase.raw('messages_count + 1'),
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId);

    return {
      id: data.id,
      ticketId: data.ticket_id,
      senderId: data.sender_id,
      senderName: data.sender?.full_name || 'Unknown',
      senderRole: data.sender?.role === 'admin' ? 'admin' : 'user',
      message: data.message,
      isInternal: data.is_internal || false,
      createdAt: new Date(data.created_at),
      attachments: data.attachments,
    };
  } catch (error: any) {
    console.error('Create ticket message error:', error);
    throw new Error(error.message || 'Failed to create ticket message');
  }
};

/**
 * Update ticket status
 */
export const updateTicketStatus = async (
  ticketId: string,
  status: TicketStatus
): Promise<void> => {
  try {
    await requireAdmin();

    const { error } = await supabase
      .from('support_tickets')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId);

    if (error) throw error;
  } catch (error: any) {
    console.error('Update ticket status error:', error);
    throw new Error(error.message || 'Failed to update ticket status');
  }
};

/**
 * Update ticket priority
 */
export const updateTicketPriority = async (
  ticketId: string,
  priority: TicketPriority
): Promise<void> => {
  try {
    await requireAdmin();

    const { error } = await supabase
      .from('support_tickets')
      .update({
        priority,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId);

    if (error) throw error;
  } catch (error: any) {
    console.error('Update ticket priority error:', error);
    throw new Error(error.message || 'Failed to update ticket priority');
  }
};

/**
 * Assign ticket to admin
 */
export const assignTicket = async (
  ticketId: string,
  adminId: string
): Promise<void> => {
  try {
    await requireAdmin();

    const { error } = await supabase
      .from('support_tickets')
      .update({
        assigned_to: adminId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId);

    if (error) throw error;
  } catch (error: any) {
    console.error('Assign ticket error:', error);
    throw new Error(error.message || 'Failed to assign ticket');
  }
};

/**
 * Get all canned responses
 */
export const getCannedResponses = async (category?: string): Promise<CannedResponse[]> => {
  try {
    await requireAdmin();

    let query = supabase
      .from('canned_responses')
      .select('*')
      .order('usage_count', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(response => ({
      id: response.id,
      title: response.title,
      content: response.content,
      category: response.category,
      shortcut: response.shortcut,
      usageCount: response.usage_count || 0,
      createdAt: new Date(response.created_at),
    }));
  } catch (error: any) {
    console.error('Get canned responses error:', error);
    throw new Error(error.message || 'Failed to fetch canned responses');
  }
};

/**
 * Create or update canned response
 */
export const saveCannedResponse = async (
  response: Partial<CannedResponse> & { id?: string }
): Promise<CannedResponse> => {
  try {
    await requireAdmin();

    const isNew = !response.id || response.id.startsWith('NEW');

    if (isNew) {
      const { data, error } = await supabase
        .from('canned_responses')
        .insert({
          title: response.title,
          content: response.content,
          category: response.category,
          shortcut: response.shortcut,
          usage_count: 0,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        title: data.title,
        content: data.content,
        category: data.category,
        shortcut: data.shortcut,
        usageCount: data.usage_count,
        createdAt: new Date(data.created_at),
      };
    } else {
      const { data, error } = await supabase
        .from('canned_responses')
        .update({
          title: response.title,
          content: response.content,
          category: response.category,
          shortcut: response.shortcut,
        })
        .eq('id', response.id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        title: data.title,
        content: data.content,
        category: data.category,
        shortcut: data.shortcut,
        usageCount: data.usage_count,
        createdAt: new Date(data.created_at),
      };
    }
  } catch (error: any) {
    console.error('Save canned response error:', error);
    throw new Error(error.message || 'Failed to save canned response');
  }
};

/**
 * Delete canned response
 */
export const deleteCannedResponse = async (id: string): Promise<void> => {
  try {
    await requireAdmin();

    const { error } = await supabase
      .from('canned_responses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error: any) {
    console.error('Delete canned response error:', error);
    throw new Error(error.message || 'Failed to delete canned response');
  }
};

/**
 * Get all chat sessions
 */
export const getChatSessions = async (status?: ChatStatus): Promise<ChatSession[]> => {
  try {
    await requireAdmin();

    let query = supabase
      .from('chat_sessions')
      .select(`
        *,
        user:users!user_id(full_name, email),
        assigned_admin:users!assigned_to(full_name)
      `)
      .order('started_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(session => ({
      id: session.id,
      userId: session.user_id,
      userName: session.user?.full_name || 'Unknown User',
      userEmail: session.user?.email || '',
      status: session.status as ChatStatus,
      assignedTo: session.assigned_to,
      assignedToName: session.assigned_admin?.full_name,
      startedAt: new Date(session.started_at),
      lastMessageAt: new Date(session.last_message_at || session.started_at),
      messagesCount: session.messages_count || 0,
      waitingTime: session.waiting_time || 0,
    }));
  } catch (error: any) {
    console.error('Get chat sessions error:', error);
    throw new Error(error.message || 'Failed to fetch chat sessions');
  }
};

/**
 * Get messages for a specific chat session
 */
export const getChatMessages = async (chatId: string): Promise<ChatMessage[]> => {
  try {
    await requireAdmin();

    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        sender:users!sender_id(full_name, role)
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(msg => ({
      id: msg.id,
      chatId: msg.chat_id,
      senderId: msg.sender_id,
      senderName: msg.sender?.full_name || 'Unknown',
      senderRole: msg.sender?.role === 'admin' ? 'admin' : 'user',
      message: msg.message,
      createdAt: new Date(msg.created_at),
    }));
  } catch (error: any) {
    console.error('Get chat messages error:', error);
    throw new Error(error.message || 'Failed to fetch chat messages');
  }
};

/**
 * Send a chat message
 */
export const sendChatMessage = async (
  chatId: string,
  message: string
): Promise<ChatMessage> => {
  try {
    await requireAdmin();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        chat_id: chatId,
        sender_id: user.id,
        message,
      })
      .select(`
        *,
        sender:users!sender_id(full_name, role)
      `)
      .single();

    if (error) throw error;

    // Update chat session's last_message_at and messages_count
    await supabase
      .from('chat_sessions')
      .update({
        last_message_at: new Date().toISOString(),
        messages_count: supabase.raw('messages_count + 1'),
      })
      .eq('id', chatId);

    return {
      id: data.id,
      chatId: data.chat_id,
      senderId: data.sender_id,
      senderName: data.sender?.full_name || 'Unknown',
      senderRole: data.sender?.role === 'admin' ? 'admin' : 'user',
      message: data.message,
      createdAt: new Date(data.created_at),
    };
  } catch (error: any) {
    console.error('Send chat message error:', error);
    throw new Error(error.message || 'Failed to send chat message');
  }
};

/**
 * Update chat session status
 */
export const updateChatStatus = async (
  chatId: string,
  status: ChatStatus,
  assignedTo?: string
): Promise<void> => {
  try {
    await requireAdmin();

    const updateData: any = { status };
    if (assignedTo !== undefined) {
      updateData.assigned_to = assignedTo;
    }

    const { error } = await supabase
      .from('chat_sessions')
      .update(updateData)
      .eq('id', chatId);

    if (error) throw error;
  } catch (error: any) {
    console.error('Update chat status error:', error);
    throw new Error(error.message || 'Failed to update chat status');
  }
};

/**
 * Get support dashboard metrics
 */
export const getSupportDashboardMetrics = async () => {
  try {
    await requireAdmin();

    // Get ticket counts by status
    const { data: ticketCounts } = await supabase
      .from('support_tickets')
      .select('status', { count: 'exact' });

    const openTickets = ticketCounts?.filter(t => t.status === 'open').length || 0;

    // Get active and waiting chat sessions
    const { data: chatSessions } = await supabase
      .from('chat_sessions')
      .select('status', { count: 'exact' });

    const activeChatCount = chatSessions?.filter(c => c.status === 'active').length || 0;
    const waitingChatCount = chatSessions?.filter(c => c.status === 'waiting').length || 0;

    // Calculate average response time (mock for now - would need real implementation)
    const avgResponseTime = '2h 15m';
    const avgResolutionTime = '8h 30m';

    return {
      openTickets,
      activeChatCount,
      waitingChatCount,
      avgResponseTime,
      avgResolutionTime,
    };
  } catch (error: any) {
    console.error('Get support dashboard metrics error:', error);
    throw new Error(error.message || 'Failed to fetch support metrics');
  }
};
