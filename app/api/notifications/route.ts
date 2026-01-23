import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET - List notifications for current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    // Get notifications
    let query = supabase
      .from('notifications')
      .select(`
        id,
        type,
        match_id,
        from_user_id,
        content,
        is_read,
        created_at,
        from_user:from_user_id (
          id,
          display_name,
          avatar_url
        ),
        matches:match_id (
          id,
          user_a_id,
          user_b_id
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data: notifications, error } = await query

    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json({ error: 'Error al obtener notificaciones' }, { status: 500 })
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    // Transform notifications
    type FromUser = { id: string; display_name: string; avatar_url: string | null }
    type MatchInfo = { id: string; user_a_id: string; user_b_id: string }

    const transformedNotifications = notifications?.map(n => {
      const fromUser = n.from_user as unknown as FromUser | null
      const matchInfo = n.matches as unknown as MatchInfo | null

      return {
        id: n.id,
        type: n.type,
        matchId: n.match_id,
        content: n.content,
        isRead: n.is_read,
        createdAt: n.created_at,
        fromUser: fromUser ? {
          id: fromUser.id,
          displayName: fromUser.display_name,
          avatarUrl: fromUser.avatar_url,
        } : null,
        match: matchInfo ? {
          id: matchInfo.id,
        } : null,
      }
    }) || []

    return NextResponse.json({
      notifications: transformedNotifications,
      unreadCount: unreadCount || 0,
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    return NextResponse.json({ error: 'Error al obtener notificaciones' }, { status: 500 })
  }
}

// POST - Mark notifications as read
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationIds, markAllRead } = body as { notificationIds?: string[]; markAllRead?: boolean }

    if (markAllRead) {
      // Mark all notifications as read
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) {
        console.error('Error marking all as read:', error)
        return NextResponse.json({ error: 'Error al marcar como leídas' }, { status: 500 })
      }

      return NextResponse.json({ success: true, markedCount: 'all' })
    }

    if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .in('id', notificationIds)

      if (error) {
        console.error('Error marking notifications as read:', error)
        return NextResponse.json({ error: 'Error al marcar como leídas' }, { status: 500 })
      }

      return NextResponse.json({ success: true, markedCount: notificationIds.length })
    }

    return NextResponse.json({ error: 'Debe especificar notificationIds o markAllRead' }, { status: 400 })
  } catch (error) {
    console.error('Mark notifications error:', error)
    return NextResponse.json({ error: 'Error al marcar notificaciones' }, { status: 500 })
  }
}
