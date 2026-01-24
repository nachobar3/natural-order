import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushNotification } from '@/lib/push-notifications'

export const dynamic = 'force-dynamic'

const MAX_COMMENTS_PER_MONTH = 10
const MAX_COMMENT_LENGTH = 300

// GET - List comments for a match
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { id: matchId } = params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verify user is part of this match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, user_a_id, user_b_id')
      .eq('id', matchId)
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match no encontrado' }, { status: 404 })
    }

    // Get comments with user info
    const { data: comments, error: commentsError } = await supabase
      .from('match_comments')
      .select(`
        id,
        user_id,
        content,
        created_at,
        updated_at,
        users:user_id (
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('match_id', matchId)
      .order('created_at', { ascending: true })

    if (commentsError) {
      console.error('Error fetching comments:', commentsError)
      return NextResponse.json({ error: 'Error al obtener comentarios' }, { status: 500 })
    }

    // Get comment count for current user this month
    const { data: countData } = await supabase.rpc('get_user_comment_count_this_month', {
      p_match_id: matchId,
      p_user_id: user.id,
    })

    const myCommentCountThisMonth = countData || 0

    // Transform comments
    type UserInfo = { id: string; display_name: string; avatar_url: string | null }
    const transformedComments = comments?.map(c => {
      const userInfo = c.users as unknown as UserInfo | null
      return {
        id: c.id,
        userId: c.user_id,
        content: c.content,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        isEdited: c.updated_at !== c.created_at,
        isMine: c.user_id === user.id,
        user: {
          id: userInfo?.id || c.user_id,
          displayName: userInfo?.display_name || 'Usuario',
          avatarUrl: userInfo?.avatar_url || null,
        },
      }
    }) || []

    return NextResponse.json({
      comments: transformedComments,
      myCommentCountThisMonth,
      maxCommentsPerMonth: MAX_COMMENTS_PER_MONTH,
      canComment: myCommentCountThisMonth < MAX_COMMENTS_PER_MONTH,
    })
  } catch (error) {
    console.error('Get comments error:', error)
    return NextResponse.json({ error: 'Error al obtener comentarios' }, { status: 500 })
  }
}

// POST - Create a new comment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { id: matchId } = params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { content } = body as { content: string }

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'El contenido es requerido' }, { status: 400 })
    }

    const trimmedContent = content.trim()

    if (trimmedContent.length === 0) {
      return NextResponse.json({ error: 'El comentario no puede estar vacío' }, { status: 400 })
    }

    if (trimmedContent.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        { error: `El comentario no puede exceder ${MAX_COMMENT_LENGTH} caracteres` },
        { status: 400 }
      )
    }

    // Verify user is part of this match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, user_a_id, user_b_id')
      .eq('id', matchId)
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match no encontrado' }, { status: 404 })
    }

    // Check monthly limit
    const { data: countData } = await supabase.rpc('get_user_comment_count_this_month', {
      p_match_id: matchId,
      p_user_id: user.id,
    })

    const currentCount = countData || 0

    if (currentCount >= MAX_COMMENTS_PER_MONTH) {
      return NextResponse.json(
        { error: `Alcanzaste el límite de ${MAX_COMMENTS_PER_MONTH} comentarios por mes en este match` },
        { status: 400 }
      )
    }

    // Create comment
    const { data: comment, error: insertError } = await supabase
      .from('match_comments')
      .insert({
        match_id: matchId,
        user_id: user.id,
        content: trimmedContent,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting comment:', insertError)
      return NextResponse.json({ error: 'Error al crear comentario' }, { status: 500 })
    }

    // Create notification for the other user
    const otherUserId = match.user_a_id === user.id ? match.user_b_id : match.user_a_id

    const { data: currentUser } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', user.id)
      .single()

    const notificationContent = `${currentUser?.display_name || 'Un usuario'} comentó en el trade`

    await supabase.from('notifications').insert({
      user_id: otherUserId,
      type: 'new_comment',
      match_id: matchId,
      from_user_id: user.id,
      content: notificationContent,
    })

    // Send push notification (fire-and-forget)
    sendPushNotification({
      user_id: otherUserId,
      title: 'Nuevo comentario',
      body: notificationContent,
      data: {
        type: 'new_comment',
        matchId,
        url: `/dashboard/matches/${matchId}`,
      },
    })

    return NextResponse.json({
      comment: {
        id: comment.id,
        userId: comment.user_id,
        content: comment.content,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
        isEdited: false,
        isMine: true,
      },
      remainingComments: MAX_COMMENTS_PER_MONTH - currentCount - 1,
    })
  } catch (error) {
    console.error('Create comment error:', error)
    return NextResponse.json({ error: 'Error al crear comentario' }, { status: 500 })
  }
}

// PATCH - Edit a comment
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { id: matchId } = params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { commentId, content } = body as { commentId: string; content: string }

    if (!commentId || !content || typeof content !== 'string') {
      return NextResponse.json({ error: 'commentId y content son requeridos' }, { status: 400 })
    }

    const trimmedContent = content.trim()

    if (trimmedContent.length === 0) {
      return NextResponse.json({ error: 'El comentario no puede estar vacío' }, { status: 400 })
    }

    if (trimmedContent.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        { error: `El comentario no puede exceder ${MAX_COMMENT_LENGTH} caracteres` },
        { status: 400 }
      )
    }

    // Verify user owns this comment
    const { data: comment, error: commentError } = await supabase
      .from('match_comments')
      .select('id, user_id, match_id')
      .eq('id', commentId)
      .eq('match_id', matchId)
      .single()

    if (commentError || !comment) {
      return NextResponse.json({ error: 'Comentario no encontrado' }, { status: 404 })
    }

    if (comment.user_id !== user.id) {
      return NextResponse.json({ error: 'No podés editar comentarios de otros usuarios' }, { status: 403 })
    }

    // Update comment
    const { data: updatedComment, error: updateError } = await supabase
      .from('match_comments')
      .update({
        content: trimmedContent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating comment:', updateError)
      return NextResponse.json({ error: 'Error al editar comentario' }, { status: 500 })
    }

    return NextResponse.json({
      comment: {
        id: updatedComment.id,
        userId: updatedComment.user_id,
        content: updatedComment.content,
        createdAt: updatedComment.created_at,
        updatedAt: updatedComment.updated_at,
        isEdited: true,
        isMine: true,
      },
    })
  } catch (error) {
    console.error('Edit comment error:', error)
    return NextResponse.json({ error: 'Error al editar comentario' }, { status: 500 })
  }
}
