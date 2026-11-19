import React, { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, MessageCircle, Brain, Smile, Calendar } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

const EMOTION_COLORS = {
  joy:     '#f59e0b',
  hope:    '#10b981',
  neutral: '#94a3b8',
  anxiety: '#f97316',
  sadness: '#3b82f6',
  anger:   '#ef4444',
  fear:    '#8b5cf6',
}

const RESOURCES = [
  { title: 'iCall India',            desc: 'Psychosocial helpline',   contact: '9152987821' },
  { title: 'Vandrevala Foundation',  desc: '24/7 crisis support',     contact: '1860-2662-345' },
  { title: 'NIMHANS',                desc: 'National institute',       contact: '080-46110007' },
]

function StatCard({ icon: Icon, label, value, sub, hexColor }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className="text-2xl font-bold mt-1 text-slate-800 capitalize">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <div className="p-2.5 rounded-xl" style={{ background: hexColor + '20' }}>
          <Icon className="w-5 h-5" style={{ color: hexColor }} />
        </div>
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-medium text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  )
}

function moodLabel(score) {
  if (score >= 0.6) return 'Very Good'
  if (score >= 0.3) return 'Good'
  if (score >= 0)   return 'Neutral'
  if (score >= -0.4) return 'Low'
  return 'Very Low'
}

export default function DashboardPage() {
  const { user }  = useAuth()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/analytics/summary')
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
    </div>
  )
  if (!data) return (
    <div className="flex items-center justify-center h-full text-slate-500">
      Failed to load analytics
    </div>
  )

  const chartData = data.weekly_trends.map(t => ({
    ...t,
    date: t.date.slice(5),   // MM-DD
    mood: t.average_mood,
  }))

  const emotionCounts = {}
  data.weekly_trends.forEach(t => {
    if (t.dominant_emotion)
      emotionCounts[t.dominant_emotion] = (emotionCounts[t.dominant_emotion] || 0) + 1
  })
  const pieData = Object.entries(emotionCounts).map(([name, value]) => ({ name, value }))

  const trendColor =
    data.mood_trend === 'improving' ? '#10b981' :
    data.mood_trend === 'declining' ? '#ef4444' : '#94a3b8'

  const trendBg =
    data.mood_trend === 'improving' ? 'bg-green-50 border-green-100' :
    data.mood_trend === 'declining' ? 'bg-red-50 border-red-100'     :
                                       'bg-slate-50 border-slate-100'

  const TrendIcon =
    data.mood_trend === 'improving' ? TrendingUp   :
    data.mood_trend === 'declining' ? TrendingDown : Minus

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Your Wellness Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">
          Hello, {user?.username} — here's your emotional wellbeing summary
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={MessageCircle} label="Total Sessions"
          value={data.total_sessions} sub="chat sessions" hexColor="#0ea5e9" />
        <StatCard icon={Brain} label="Messages Sent"
          value={data.total_messages} sub="total interactions" hexColor="#8b5cf6" />
        <StatCard icon={Smile} label="Average Mood"
          value={moodLabel(data.average_mood_score)}
          sub={`Score: ${data.average_mood_score}`}
          hexColor={data.average_mood_score >= 0 ? '#10b981' : '#ef4444'} />
        <StatCard icon={Calendar} label="Common Emotion"
          value={data.most_common_emotion} sub="most detected"
          hexColor={EMOTION_COLORS[data.most_common_emotion] || '#94a3b8'} />
      </div>

      {/* Trend banner */}
      <div className={`card flex items-center gap-3 ${trendBg}`}>
        <TrendIcon className="w-5 h-5 flex-shrink-0" style={{ color: trendColor }} />
        <div>
          <p className="font-semibold text-slate-700 capitalize">Mood is {data.mood_trend}</p>
          <p className="text-sm text-slate-500">
            {data.mood_trend === 'improving' && 'Great progress! Your emotional wellbeing is trending upward.'}
            {data.mood_trend === 'declining' && "It looks like you've had a tough period. Consider reaching out to a professional."}
            {data.mood_trend === 'stable'    && 'Your mood has been consistent. Keep checking in regularly.'}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Line chart */}
        <div className="card">
          <h3 className="font-semibold text-slate-700 mb-4">Mood Trend (Last 8 Days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis domain={[-1, 1]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone" dataKey="mood" name="Mood Score"
                stroke="#0ea5e9" strokeWidth={2.5}
                dot={{ r: 4, fill: '#0ea5e9' }} activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card">
          <h3 className="font-semibold text-slate-700 mb-4">Emotion Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%"
                     innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={EMOTION_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-slate-400 text-sm">
              Start chatting to see your emotion distribution
            </div>
          )}
        </div>

        {/* Bar chart */}
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-slate-700 mb-4">Daily Check-ins</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="entry_count" name="Check-ins" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Resources */}
      <div className="card bg-gradient-to-r from-primary-50 to-calm-50 border-primary-100">
        <h3 className="font-semibold text-slate-700 mb-3">Mental Health Resources</h3>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          {RESOURCES.map(r => (
            <div key={r.title} className="bg-white rounded-xl p-3 border border-slate-100">
              <p className="font-semibold text-slate-700">{r.title}</p>
              <p className="text-slate-500 text-xs">{r.desc}</p>
              <p className="text-primary-600 font-medium mt-1">{r.contact}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
