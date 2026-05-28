import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getComments, addComment } from '@/services/videoAnalysisSupabase'
import type { VideoAnalysisComment } from '@/services/videoAnalysisTypes'

interface CommentThreadProps {
  analysisId: string
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'ahora'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
  return `hace ${Math.floor(diff / 86400)}d`
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function CommentThread({ analysisId }: CommentThreadProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<VideoAnalysisComment[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadComments()
  }, [analysisId])

  async function loadComments() {
    setLoading(true)
    const data = await getComments(analysisId)
    setComments(data)
    setLoading(false)
  }

  async function handleSend() {
    if (!text.trim() || sending) return
    setSending(true)
    const result = await addComment(analysisId, text.trim())
    if (result.success) {
      setText('')
      await loadComments()
    }
    setSending(false)
  }

  return (
    <div className="card-apple p-5">
      <h3 className="text-sm font-semibold text-apple-gray-800 dark:text-white mb-4">
        Comentarios ({comments.length})
      </h3>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-apple-gray-300 border-t-brand-green rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4 mb-4">
          {comments.length === 0 && (
            <p className="text-sm text-apple-gray-400 dark:text-apple-gray-500 text-center py-4">
              Sin comentarios aún
            </p>
          )}
          {comments.map(comment => (
            <div key={comment.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-green to-brand-greenHover flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                {getInitials(comment.user_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-apple-gray-800 dark:text-white">
                    {comment.user_name}
                  </span>
                  <span className="text-2xs text-apple-gray-400">
                    {timeAgo(comment.created_at)}
                  </span>
                </div>
                <p className="text-sm text-apple-gray-600 dark:text-apple-gray-300 mt-0.5">
                  {comment.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {user && (
        <div className="flex gap-2 pt-3 border-t border-apple-gray-200/50 dark:border-apple-gray-700/50">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Escribir comentario..."
            className="input-apple text-sm flex-1"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="px-4 py-2.5 rounded-apple text-sm font-medium bg-brand-green text-white hover:bg-brand-greenHover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Enviar'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
