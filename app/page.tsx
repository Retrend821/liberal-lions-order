'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

type Player = {
  name: string
  pos: string
  face: string
}

type BenchPlayer = {
  name: string
  face: string
}

type Manager = {
  name: string
  face: string
}

type BattingStats = {
  hits: number
  atBats: number
  walks: number
  results: string[]
}

type GameState = {
  inning: number
  isTopHalf: boolean
  currentBatterIndex: number
  battingStats: { [key: number]: BattingStats }
}

type OrderData = {
  players: Player[]
  benchPitchers: BenchPlayer[]
  benchCatchers: BenchPlayer[]
  managers: Manager[]
  gameState: GameState
}

const POSITION_STYLES: { [key: string]: { background: string, border: string } } = {
  "中": { background: 'linear-gradient(to bottom, #8fff8f 0%, #8fff8f 50%, #6de86d 50%, #6de86d 100%)', border: '2px solid #5cd45c' },
  "左": { background: 'linear-gradient(to bottom, #8fff8f 0%, #8fff8f 50%, #6de86d 50%, #6de86d 100%)', border: '2px solid #5cd45c' },
  "右": { background: 'linear-gradient(to bottom, #8fff8f 0%, #8fff8f 50%, #6de86d 50%, #6de86d 100%)', border: '2px solid #5cd45c' },
  "二": { background: 'linear-gradient(to bottom, #fff27a 0%, #fff27a 50%, #ffe847 50%, #ffe847 100%)', border: '2px solid #e6d03f' },
  "三": { background: 'linear-gradient(to bottom, #fff27a 0%, #fff27a 50%, #ffe847 50%, #ffe847 100%)', border: '2px solid #e6d03f' },
  "一": { background: 'linear-gradient(to bottom, #fff27a 0%, #fff27a 50%, #ffe847 50%, #ffe847 100%)', border: '2px solid #e6d03f' },
  "遊": { background: 'linear-gradient(to bottom, #fff27a 0%, #fff27a 50%, #ffe847 50%, #ffe847 100%)', border: '2px solid #e6d03f' },
  "捕": { background: 'linear-gradient(to bottom, #8ae4ff 0%, #8ae4ff 50%, #5bd4ff 50%, #5bd4ff 100%)', border: '2px solid #4ac4ef' },
  "投": { background: 'linear-gradient(to bottom, #ff9e9e 0%, #ff9e9e 50%, #ff7a7a 50%, #ff7a7a 100%)', border: '2px solid #e86a6a' },
  "DH": { background: 'linear-gradient(to bottom, #d8b3ff 0%, #d8b3ff 50%, #c084fc 50%, #c084fc 100%)', border: '2px solid #b366ff' }
}

// パワプロ本家風の顔アイコンSVG
const getConditionFace = (type: string, uniqueId: string = '') => {
  const id = uniqueId || Math.random().toString(36).substr(2, 9);
  const faces: { [key: string]: string } = {
    'excellent': `<svg viewBox="0 0 32 32" width="28" height="28">
      <defs><linearGradient id="grad_${id}" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#f8a0c8"/><stop offset="100%" stop-color="#e870a8"/></linearGradient></defs>
      <circle cx="16" cy="16" r="15" fill="url(#grad_${id})"/>
      <ellipse cx="16" cy="10" rx="12" ry="6" fill="rgba(255,255,255,0.35)"/>
      <line x1="11" y1="9" x2="11" y2="15" stroke="#222" stroke-width="2" stroke-linecap="round"/>
      <line x1="21" y1="9" x2="21" y2="15" stroke="#222" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="16" cy="21" rx="7" ry="5" fill="#333"/>
      <ellipse cx="16" cy="20" rx="5" ry="2" fill="#fff"/>
      <ellipse cx="16" cy="24" rx="2" ry="2" fill="#e85050"/>
    </svg>`,
    'good': `<svg viewBox="0 0 32 32" width="28" height="28">
      <defs><linearGradient id="grad_${id}" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#ff7070"/><stop offset="100%" stop-color="#e84848"/></linearGradient></defs>
      <circle cx="16" cy="16" r="15" fill="url(#grad_${id})"/>
      <ellipse cx="16" cy="10" rx="12" ry="6" fill="rgba(255,255,255,0.35)"/>
      <line x1="11" y1="9" x2="11" y2="15" stroke="#222" stroke-width="2" stroke-linecap="round"/>
      <line x1="21" y1="9" x2="21" y2="15" stroke="#222" stroke-width="2" stroke-linecap="round"/>
      <path d="M9 20 Q16 26 23 20" stroke="#222" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`,
    'normal': `<svg viewBox="0 0 32 32" width="28" height="28">
      <defs><linearGradient id="grad_${id}" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#ffe040"/><stop offset="100%" stop-color="#f0a020"/></linearGradient></defs>
      <circle cx="16" cy="16" r="15" fill="url(#grad_${id})"/>
      <ellipse cx="16" cy="10" rx="12" ry="6" fill="rgba(255,255,255,0.35)"/>
      <line x1="11" y1="9" x2="11" y2="15" stroke="#222" stroke-width="2" stroke-linecap="round"/>
      <line x1="21" y1="9" x2="21" y2="15" stroke="#222" stroke-width="2" stroke-linecap="round"/>
      <line x1="10" y1="21" x2="22" y2="21" stroke="#222" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    'bad': `<svg viewBox="0 0 32 32" width="28" height="28">
      <defs><linearGradient id="grad_${id}" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#80d0ff"/><stop offset="100%" stop-color="#50a8e0"/></linearGradient></defs>
      <circle cx="16" cy="16" r="15" fill="url(#grad_${id})"/>
      <ellipse cx="16" cy="10" rx="12" ry="6" fill="rgba(255,255,255,0.35)"/>
      <line x1="9" y1="15" x2="13" y2="11" stroke="#222" stroke-width="2" stroke-linecap="round"/>
      <line x1="23" y1="15" x2="19" y2="11" stroke="#222" stroke-width="2" stroke-linecap="round"/>
      <path d="M9 23 Q16 18 23 23" stroke="#222" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`,
    'terrible': `<svg viewBox="0 0 32 32" width="28" height="28">
      <defs><linearGradient id="grad_${id}" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#b080d0"/><stop offset="100%" stop-color="#8050a8"/></linearGradient></defs>
      <circle cx="16" cy="16" r="15" fill="url(#grad_${id})"/>
      <ellipse cx="16" cy="10" rx="12" ry="6" fill="rgba(255,255,255,0.35)"/>
      <line x1="9" y1="15" x2="13" y2="11" stroke="#222" stroke-width="2" stroke-linecap="round"/>
      <line x1="23" y1="15" x2="19" y2="11" stroke="#222" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="16" cy="22" rx="5" ry="4" fill="#333"/>
    </svg>`
  };
  return faces[type] || faces['normal'];
}

// 絵文字から新形式への変換
const convertCondition = (emoji: string): string => {
  const mapping: { [key: string]: string } = { '🤩': 'excellent', '😊': 'good', '😐': 'normal', '😰': 'bad', '🤢': 'terrible' };
  return mapping[emoji] || emoji;
}

const FACE_OPTIONS = [
  { key: 'excellent', label: '絶好調' },
  { key: 'good', label: '好調' },
  { key: 'normal', label: 'ふつう' },
  { key: 'bad', label: '不調' },
  { key: 'terrible', label: '絶不調' }
]

const getFaceClass = (emoji: string) => {
  return ''
}

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([])
  const [benchPitchers, setBenchPitchers] = useState<BenchPlayer[]>([])
  const [benchCatchers, setBenchCatchers] = useState<BenchPlayer[]>([])
  const [managers, setManagers] = useState<Manager[]>([])
  const [gameState, setGameState] = useState<GameState>({
    inning: 1,
    isTopHalf: true,
    currentBatterIndex: 0,
    battingStats: {}
  })
  const [currentTab, setCurrentTab] = useState<'order' | 'game'>('order')
  const [playerName, setPlayerName] = useState('')
  const [playerPos, setPlayerPos] = useState('投')
  const [benchPitcherName, setBenchPitcherName] = useState('')
  const [benchCatcherName, setBenchCatcherName] = useState('')
  const [managerName, setManagerName] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [openFaceDropdown, setOpenFaceDropdown] = useState<string | null>(null)
  const [dataId, setDataId] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<'connected' | 'disconnected'>('disconnected')
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null)
  const [selectedPitcher, setSelectedPitcher] = useState<number | null>(null)
  const [selectedCatcher, setSelectedCatcher] = useState<number | null>(null)
  const [selectedManager, setSelectedManager] = useState<number | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const lastSaveTime = useRef<number>(0)

  useEffect(() => {
    loadData()

    // リアルタイム同期のセットアップ
    const channel = supabase
      .channel('order_data_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'order_data'
        },
        (payload) => {
          // 自分の更新から2秒以内は無視（自分の更新の反映を防ぐ）
          const now = Date.now()
          if (now - lastSaveTime.current < 2000) {
            return
          }

          console.log('リアルタイム更新を受信:', payload)
          const newData = payload.new as { id: string; data: OrderData }
          if (newData && newData.data) {
            setPlayers(newData.data.players || [])
            setBenchPitchers(newData.data.benchPitchers || [])
            setBenchCatchers(newData.data.benchCatchers || [])
            setManagers(newData.data.managers || [])
            setGameState(newData.data.gameState || {
              inning: 1,
              isTopHalf: true,
              currentBatterIndex: 0,
              battingStats: {}
            })
            showToast('🔄 データが更新されました')
          }
        }
      )
      .subscribe((status) => {
        console.log('リアルタイム接続状態:', status)
        if (status === 'SUBSCRIBED') {
          setSyncStatus('connected')
        } else {
          setSyncStatus('disconnected')
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [])

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 2000)
  }

  const loadData = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('order_data')
      .select('*')
      .limit(1)
      .single()

    if (error) {
      console.error('読み込みエラー:', error)
    } else if (data) {
      setDataId(data.id)
      const orderData = data.data as OrderData
      setPlayers(orderData.players || [])
      setBenchPitchers(orderData.benchPitchers || [])
      setBenchCatchers(orderData.benchCatchers || [])
      setManagers(orderData.managers || [])
      setGameState(orderData.gameState || {
        inning: 1,
        isTopHalf: true,
        currentBatterIndex: 0,
        battingStats: {}
      })
    }
    setLoading(false)
  }

  const saveData = async (showMessage = true) => {
    if (!dataId) return

    // 自分の更新時刻を記録
    lastSaveTime.current = Date.now()

    const orderData: OrderData = {
      players,
      benchPitchers,
      benchCatchers,
      managers,
      gameState
    }

    const { error } = await supabase
      .from('order_data')
      .update({ data: orderData, updated_at: new Date().toISOString() })
      .eq('id', dataId)

    if (error) {
      console.error('保存エラー:', error)
      if (showMessage) showToast('❌ 保存失敗')
    } else {
      if (showMessage) showToast('💾 保存しました')
    }
  }

  const addPlayer = () => {
    if (!playerName.trim()) {
      alert('選手名を入力してください')
      return
    }
    const newPlayers = [...players, { name: playerName.trim(), pos: playerPos, face: '😊' }]
    const newBattingStats = { ...gameState.battingStats }
    newBattingStats[newPlayers.length - 1] = { hits: 0, atBats: 0, walks: 0, results: [] }

    setPlayers(newPlayers)
    setGameState({ ...gameState, battingStats: newBattingStats })
    setPlayerName('')
  }

  const addBenchPitcher = () => {
    if (!benchPitcherName.trim()) {
      alert('控え投手名を入力してください')
      return
    }
    setBenchPitchers([...benchPitchers, { name: benchPitcherName.trim(), face: '😊' }])
    setBenchPitcherName('')
  }

  const addBenchCatcher = () => {
    if (!benchCatcherName.trim()) {
      alert('控え捕手名を入力してください')
      return
    }
    setBenchCatchers([...benchCatchers, { name: benchCatcherName.trim(), face: '😊' }])
    setBenchCatcherName('')
  }

  const addManager = () => {
    if (!managerName.trim()) {
      alert('マネージャー名を入力してください')
      return
    }
    setManagers([...managers, { name: managerName.trim(), face: '😊' }])
    setManagerName('')
  }

  const deletePlayer = (index: number) => {
    if (confirm(`${players[index].name}を削除しますか？`)) {
      const newPlayers = players.filter((_, i) => i !== index)
      const newBattingStats: { [key: number]: BattingStats } = {}
      Object.keys(gameState.battingStats).forEach(key => {
        const oldIdx = parseInt(key)
        if (oldIdx < index) {
          newBattingStats[oldIdx] = gameState.battingStats[oldIdx]
        } else if (oldIdx > index) {
          newBattingStats[oldIdx - 1] = gameState.battingStats[oldIdx]
        }
      })
      setPlayers(newPlayers)
      setGameState({ ...gameState, battingStats: newBattingStats })
    }
  }

  const handlePlayerSelect = (index: number) => {
    if (selectedPlayer === null) {
      setSelectedPlayer(index)
    } else if (selectedPlayer === index) {
      setSelectedPlayer(null)
    } else {
      // 入れ替え
      const newPlayers = [...players]
      ;[newPlayers[selectedPlayer], newPlayers[index]] = [newPlayers[index], newPlayers[selectedPlayer]]

      const newBattingStats = { ...gameState.battingStats }
      const tempStats = newBattingStats[selectedPlayer]
      newBattingStats[selectedPlayer] = newBattingStats[index]
      newBattingStats[index] = tempStats

      setPlayers(newPlayers)
      setGameState({ ...gameState, battingStats: newBattingStats })
      setSelectedPlayer(null)
    }
  }

  const handlePitcherSelect = (index: number) => {
    if (selectedPitcher === null) {
      setSelectedPitcher(index)
    } else if (selectedPitcher === index) {
      setSelectedPitcher(null)
    } else {
      const newBench = [...benchPitchers]
      ;[newBench[selectedPitcher], newBench[index]] = [newBench[index], newBench[selectedPitcher]]
      setBenchPitchers(newBench)
      setSelectedPitcher(null)
    }
  }

  const handleCatcherSelect = (index: number) => {
    if (selectedCatcher === null) {
      setSelectedCatcher(index)
    } else if (selectedCatcher === index) {
      setSelectedCatcher(null)
    } else {
      const newBench = [...benchCatchers]
      ;[newBench[selectedCatcher], newBench[index]] = [newBench[index], newBench[selectedCatcher]]
      setBenchCatchers(newBench)
      setSelectedCatcher(null)
    }
  }

  const handleManagerSelect = (index: number) => {
    if (selectedManager === null) {
      setSelectedManager(index)
    } else if (selectedManager === index) {
      setSelectedManager(null)
    } else {
      const newManagers = [...managers]
      ;[newManagers[selectedManager], newManagers[index]] = [newManagers[index], newManagers[selectedManager]]
      setManagers(newManagers)
      setSelectedManager(null)
    }
  }

  const changePosition = (index: number, newPos: string) => {
    const newPlayers = [...players]
    newPlayers[index].pos = newPos
    setPlayers(newPlayers)
  }

  const changeFace = (index: number, newFace: string, type: 'player' | 'pitcher' | 'catcher' | 'manager') => {
    if (type === 'player') {
      const newPlayers = [...players]
      newPlayers[index].face = newFace
      setPlayers(newPlayers)
    } else if (type === 'pitcher') {
      const newBench = [...benchPitchers]
      newBench[index].face = newFace
      setBenchPitchers(newBench)
    } else if (type === 'catcher') {
      const newBench = [...benchCatchers]
      newBench[index].face = newFace
      setBenchCatchers(newBench)
    } else {
      const newManagers = [...managers]
      newManagers[index].face = newFace
      setManagers(newManagers)
    }
    setOpenFaceDropdown(null)
  }

  const updateBattingResult = (playerIndex: number, atBatIndex: number, result: string) => {
    const newBattingStats = { ...gameState.battingStats }
    if (!newBattingStats[playerIndex]) {
      newBattingStats[playerIndex] = { hits: 0, atBats: 0, walks: 0, results: [] }
    }

    const stats = { ...newBattingStats[playerIndex] }
    const oldResult = stats.results[atBatIndex]

    if (oldResult) {
      const oldNormalized = normalizeResult(oldResult)
      updateStatsForResult(stats, oldNormalized, -1)
    }

    stats.results[atBatIndex] = result
    if (result.trim()) {
      const normalized = normalizeResult(result)
      updateStatsForResult(stats, normalized, 1)
    }

    stats.hits = Math.max(0, stats.hits)
    stats.atBats = Math.max(0, stats.atBats)
    stats.walks = Math.max(0, stats.walks)

    newBattingStats[playerIndex] = stats
    setGameState({ ...gameState, battingStats: newBattingStats })
  }

  const normalizeResult = (text: string): string => {
    if (!text.trim()) return ''
    const t = text.toLowerCase().trim()

    if (t.includes('安') || t.includes('ヒット') || t === 'h') return 'hit'
    if (t.includes('二塁打') || t === '2b') return '2hit'
    if (t.includes('三塁打') || t === '3b') return '3hit'
    if (t.includes('本塁打') || t.includes('ホームラン') || t === 'hr') return 'homerun'
    if (t.includes('三振') || t === 'k') return 'strikeout'
    if (t.includes('四球') || t === 'bb') return 'walk'
    if (t.includes('死球') || t === 'hbp') return 'hbp'
    if (t.includes('犠飛') || t === 'sf') return 'sacrifice_fly'
    if (t.includes('犠打') || t === 'sh') return 'sacrifice_bunt'
    if (t.includes('ゴロ')) return 'grounder'
    if (t.includes('フライ') || t.includes('飛')) return 'fly'
    if (t.includes('エラー') || t.includes('失')) return 'error'

    return 'custom'
  }

  const updateStatsForResult = (stats: BattingStats, result: string, multiplier: number) => {
    const nonAtBatResults = ['walk', 'hbp', 'sacrifice_bunt', 'sacrifice_fly']
    const hitResults = ['hit', '2hit', '3hit', 'homerun']

    if (result && !nonAtBatResults.includes(result)) {
      stats.atBats += multiplier
    }
    if (hitResults.includes(result)) {
      stats.hits += multiplier
    }
    if (['walk', 'hbp'].includes(result)) {
      stats.walks += multiplier
    }
  }

  const getTeamStats = () => {
    let totalHits = 0
    let totalAtBats = 0
    let totalWalks = 0

    Object.values(gameState.battingStats).forEach(stats => {
      totalHits += stats.hits || 0
      totalAtBats += stats.atBats || 0
      totalWalks += stats.walks || 0
    })

    const avg = totalAtBats > 0 ? (totalHits / totalAtBats).toFixed(3) : '.---'
    const obp = (totalAtBats + totalWalks) > 0
      ? ((totalHits + totalWalks) / (totalAtBats + totalWalks)).toFixed(3)
      : '.---'

    return { totalHits, totalAtBats, totalWalks, avg, obp }
  }

  const resetGame = () => {
    if (confirm('試合記録をリセットしますか？')) {
      const newBattingStats: { [key: number]: BattingStats } = {}
      players.forEach((_, index) => {
        newBattingStats[index] = { hits: 0, atBats: 0, walks: 0, results: [] }
      })
      setGameState({
        inning: 1,
        isTopHalf: true,
        currentBatterIndex: 0,
        battingStats: newBattingStats
      })
    }
  }

  const clearAll = async () => {
    if (confirm('全てのデータを削除しますか？')) {
      setPlayers([])
      setBenchPitchers([])
      setBenchCatchers([])
      setManagers([])
      setGameState({
        inning: 1,
        isTopHalf: true,
        currentBatterIndex: 0,
        battingStats: {}
      })
    }
  }

  useEffect(() => {
    if (!loading && dataId) {
      const timer = setTimeout(() => {
        saveData(false)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [players, benchPitchers, benchCatchers, managers, gameState])

  if (loading) {
    return <div className="loading">処理中...</div>
  }

  const teamStats = getTeamStats()

  return (
    <div onClick={() => setOpenFaceDropdown(null)}>
      {toast && <div className="save-toast">{toast}</div>}
      <div className={`selector-overlay ${openFaceDropdown ? 'show' : ''}`} onClick={() => setOpenFaceDropdown(null)} />

      {/* ヘッダー */}
      <div className="team-header">
        <div className="liberal-badge">LIBERAL</div>
        <div className="lions-main">Lions</div>
        <div className="sync-status" style={{
          fontSize: '0.7em',
          marginTop: '5px',
          color: syncStatus === 'connected' ? '#90ee90' : '#ff9999'
        }}>
          {syncStatus === 'connected' ? '🟢 リアルタイム同期中' : '🔴 接続待機中'}
        </div>
      </div>

      {/* タブ */}
      <div className="tab-container">
        <button
          type="button"
          className={`tab ${currentTab === 'order' ? 'active' : ''}`}
          onClick={() => setCurrentTab('order')}
        >
          オーダー編集
        </button>
        <button
          type="button"
          className={`tab ${currentTab === 'game' ? 'active' : ''}`}
          onClick={() => setCurrentTab('game')}
        >
          試合記録
        </button>
      </div>

      {/* メインコンテンツ */}
      <div className="order-box">
        {currentTab === 'order' ? (
          <>
            <div className="title">スターティングオーダー</div>

            {/* 選手追加フォーム */}
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="選手名"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
                  style={{ width: '150px' }}
                />
                <select
                  value={playerPos}
                  onChange={(e) => setPlayerPos(e.target.value)}
                  style={{ width: '80px' }}
                >
                  {['投', '捕', '一', '二', '三', '遊', '左', '中', '右', 'DH'].map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
                <button type="button" onClick={addPlayer}>追加</button>
              </div>
            </div>

            {/* 選手リスト */}
            <div>
              {players.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>選手が登録されていません</div>
              ) : (
                players.map((player, index) => (
                  <div
                    key={index}
                    className="player-row"
                    onClick={() => handlePlayerSelect(index)}
                    style={{
                      cursor: 'pointer',
                      outline: selectedPlayer === index ? '3px solid #ff6600' : 'none',
                      outlineOffset: '-3px',
                      borderRadius: '8px'
                    }}
                  >
                    <div className="number">{index + 1}</div>
                    <div
                      className="name-box name-box-wide"
                      style={POSITION_STYLES[player.pos] || {}}
                    >
                      {player.name}
                    </div>
                    <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                      <div
                        className="face-box"
                        onClick={() => setOpenFaceDropdown(openFaceDropdown === `player-${index}` ? null : `player-${index}`)}
                        dangerouslySetInnerHTML={{ __html: getConditionFace(convertCondition(player.face), `player_${index}_main`) }}
                      />
                      <div className={`face-dropdown ${openFaceDropdown === `player-${index}` ? 'show' : ''}`}>
                        {FACE_OPTIONS.map((face, i) => (
                          <div
                            key={face.key}
                            className="face-option"
                            onClick={() => changeFace(index, face.key, 'player')}
                            title={face.label}
                            dangerouslySetInnerHTML={{ __html: getConditionFace(face.key, `player_${index}_opt_${i}`) }}
                          />
                        ))}
                      </div>
                    </div>
                    <select
                      className="pos-select"
                      value={player.pos}
                      onChange={(e) => changePosition(index, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      style={POSITION_STYLES[player.pos] || {}}
                    >
                      {['投', '捕', '一', '二', '三', '遊', '左', '中', '右', 'DH'].map(pos => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                    <button className="btn delete-btn" onClick={(e) => { e.stopPropagation(); deletePlayer(index); }}>×</button>
                  </div>
                ))
              )}
            </div>

            {/* 控えピッチャー */}
            <div className="sub-title">控えピッチャー</div>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <input
                  type="text"
                  placeholder="控え投手名"
                  value={benchPitcherName}
                  onChange={(e) => setBenchPitcherName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addBenchPitcher()}
                  style={{ width: '200px' }}
                />
                <button type="button" onClick={addBenchPitcher}>追加</button>
              </div>
            </div>
            <div>
              {benchPitchers.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#666', padding: '10px' }}>控えピッチャーが登録されていません</div>
              ) : (
                benchPitchers.map((player, index) => (
                  <div
                    key={index}
                    className="bench-player-row"
                    onClick={() => handlePitcherSelect(index)}
                    style={{
                      cursor: 'pointer',
                      outline: selectedPitcher === index ? '3px solid #ff6600' : 'none',
                      outlineOffset: '-3px',
                      borderRadius: '8px'
                    }}
                  >
                    <div className="number" style={{ background: 'linear-gradient(145deg, #666666, #444444)' }}>P{index + 1}</div>
                    <div className="name-box name-box-wide pos-pitcher">{player.name}</div>
                    <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                      <div
                        className="face-box"
                        onClick={() => setOpenFaceDropdown(openFaceDropdown === `pitcher-${index}` ? null : `pitcher-${index}`)}
                        dangerouslySetInnerHTML={{ __html: getConditionFace(convertCondition(player.face), `pitcher_${index}_main`) }}
                      />
                      <div className={`face-dropdown ${openFaceDropdown === `pitcher-${index}` ? 'show' : ''}`}>
                        {FACE_OPTIONS.map((face, i) => (
                          <div
                            key={face.key}
                            className="face-option"
                            onClick={() => changeFace(index, face.key, 'pitcher')}
                            title={face.label}
                            dangerouslySetInnerHTML={{ __html: getConditionFace(face.key, `pitcher_${index}_opt_${i}`) }}
                          />
                        ))}
                      </div>
                    </div>
                    <button className="btn delete-btn" onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`${player.name}を削除しますか？`)) {
                        setBenchPitchers(benchPitchers.filter((_, i) => i !== index))
                      }
                    }}>×</button>
                  </div>
                ))
              )}
            </div>

            {/* 控えキャッチャー */}
            <div className="sub-title">控えキャッチャー</div>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <input
                  type="text"
                  placeholder="控え捕手名"
                  value={benchCatcherName}
                  onChange={(e) => setBenchCatcherName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addBenchCatcher()}
                  style={{ width: '200px' }}
                />
                <button type="button" onClick={addBenchCatcher}>追加</button>
              </div>
            </div>
            <div>
              {benchCatchers.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#666', padding: '10px' }}>控えキャッチャーが登録されていません</div>
              ) : (
                benchCatchers.map((player, index) => (
                  <div
                    key={index}
                    className="bench-player-row"
                    onClick={() => handleCatcherSelect(index)}
                    style={{
                      cursor: 'pointer',
                      outline: selectedCatcher === index ? '3px solid #ff6600' : 'none',
                      outlineOffset: '-3px',
                      borderRadius: '8px'
                    }}
                  >
                    <div className="number" style={{ background: 'linear-gradient(145deg, #666666, #444444)' }}>C{index + 1}</div>
                    <div className="name-box name-box-wide pos-catcher">{player.name}</div>
                    <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                      <div
                        className="face-box"
                        onClick={() => setOpenFaceDropdown(openFaceDropdown === `catcher-${index}` ? null : `catcher-${index}`)}
                        dangerouslySetInnerHTML={{ __html: getConditionFace(convertCondition(player.face), `catcher_${index}_main`) }}
                      />
                      <div className={`face-dropdown ${openFaceDropdown === `catcher-${index}` ? 'show' : ''}`}>
                        {FACE_OPTIONS.map((face, i) => (
                          <div
                            key={face.key}
                            className="face-option"
                            onClick={() => changeFace(index, face.key, 'catcher')}
                            title={face.label}
                            dangerouslySetInnerHTML={{ __html: getConditionFace(face.key, `catcher_${index}_opt_${i}`) }}
                          />
                        ))}
                      </div>
                    </div>
                    <button className="btn delete-btn" onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`${player.name}を削除しますか？`)) {
                        setBenchCatchers(benchCatchers.filter((_, i) => i !== index))
                      }
                    }}>×</button>
                  </div>
                ))
              )}
            </div>

            {/* マネージャー */}
            <div className="sub-title">マネージャー</div>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <input
                  type="text"
                  placeholder="マネージャー名"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addManager()}
                  style={{ width: '200px' }}
                />
                <button type="button" onClick={addManager}>追加</button>
              </div>
            </div>
            <div>
              {managers.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#666', padding: '10px' }}>マネージャーが登録されていません</div>
              ) : (
                managers.map((manager, index) => (
                  <div
                    key={index}
                    className="bench-player-row"
                    onClick={() => handleManagerSelect(index)}
                    style={{
                      cursor: 'pointer',
                      outline: selectedManager === index ? '3px solid #ff6600' : 'none',
                      outlineOffset: '-3px',
                      borderRadius: '8px'
                    }}
                  >
                    <div className="number" style={{ background: 'linear-gradient(145deg, #e91e63, #c2185b)' }}>M{index + 1}</div>
                    <div className="name-box name-box-wide" style={{ background: 'linear-gradient(145deg, #fce4ec, #f8bbd9)', borderColor: '#f48fb1' }}>{manager.name}</div>
                    <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                      <div
                        className="face-box"
                        onClick={() => setOpenFaceDropdown(openFaceDropdown === `manager-${index}` ? null : `manager-${index}`)}
                        dangerouslySetInnerHTML={{ __html: getConditionFace(convertCondition(manager.face), `manager_${index}_main`) }}
                      />
                      <div className={`face-dropdown ${openFaceDropdown === `manager-${index}` ? 'show' : ''}`}>
                        {FACE_OPTIONS.map((face, i) => (
                          <div
                            key={face.key}
                            className="face-option"
                            onClick={() => changeFace(index, face.key, 'manager')}
                            title={face.label}
                            dangerouslySetInnerHTML={{ __html: getConditionFace(face.key, `manager_${index}_opt_${i}`) }}
                          />
                        ))}
                      </div>
                    </div>
                    <button className="btn delete-btn" onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`${manager.name}を削除しますか？`)) {
                        setManagers(managers.filter((_, i) => i !== index))
                      }
                    }}>×</button>
                  </div>
                ))
              )}
            </div>

            {/* ボタン */}
            <div style={{ textAlign: 'center', marginTop: '15px' }}>
              <button className="btn-clear" onClick={clearAll}>全削除</button>
            </div>
          </>
        ) : (
          <>
            {/* 試合記録タブ */}
            <div className="title">試合記録</div>

            {/* イニング表示 */}
            <div className="game-inning-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                  {gameState.inning}回 {gameState.isTopHalf ? '表' : '裏'}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    style={{ padding: '5px 10px', fontSize: '0.8em' }}
                    onClick={() => setGameState(prev => {
                      if (!prev.isTopHalf && prev.inning > 1) {
                        return { ...prev, isTopHalf: true }
                      } else if (prev.isTopHalf && prev.inning > 1) {
                        return { ...prev, isTopHalf: false, inning: prev.inning - 1 }
                      }
                      return prev
                    })}
                  >
                    前へ
                  </button>
                  <button
                    style={{ padding: '5px 10px', fontSize: '0.8em' }}
                    onClick={() => setGameState(prev => {
                      if (prev.isTopHalf) {
                        return { ...prev, isTopHalf: false }
                      } else {
                        return { ...prev, isTopHalf: true, inning: prev.inning + 1 }
                      }
                    })}
                  >
                    次へ
                  </button>
                </div>
              </div>
              <div style={{ fontSize: '0.9em', color: '#666' }}>
                現在の打者: {players.length > 0 ? `${(gameState.currentBatterIndex % players.length) + 1}番` : '-'} {players[gameState.currentBatterIndex % players.length]?.name || '-'}
              </div>
            </div>

            {/* 選手別打撃記録 */}
            {players.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                選手が登録されていません<br />オーダー編集タブで選手を追加してください
              </div>
            ) : (
              players.map((player, index) => {
                const stats = gameState.battingStats[index] || { hits: 0, atBats: 0, walks: 0, results: [] }
                const avg = stats.atBats > 0 ? (stats.hits / stats.atBats).toFixed(3) : '.---'

                return (
                  <div key={index} className="player-section">
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', fontWeight: 'bold', fontSize: '1.1em', flexWrap: 'wrap', gap: '8px' }}>
                      <div className="number" style={{ marginRight: '10px' }}>{index + 1}</div>
                      <div className="name-box" style={{ marginRight: '15px', minWidth: '100px', maxWidth: '120px', ...(POSITION_STYLES[player.pos] || {}) }}>
                        {player.name}
                      </div>
                      <div style={{ color: '#666', fontSize: '0.9em' }}>
                        {stats.hits}/{stats.atBats} 打率 {avg}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginTop: '10px' }}>
                      {[1, 2, 3, 4].map(atBat => (
                        <div key={atBat} className="at-bat-box">
                          <div style={{ fontWeight: 'bold', color: '#495057', marginBottom: '8px', fontSize: '0.9em' }}>
                            {atBat}打席目
                          </div>
                          <input
                            type="text"
                            placeholder="結果入力"
                            value={stats.results[atBat - 1] || ''}
                            onChange={(e) => updateBattingResult(index, atBat - 1, e.target.value)}
                            style={{ width: '100%', padding: '6px', textAlign: 'center', fontSize: '0.9em', boxSizing: 'border-box' }}
                          />
                          {atBat === 1 && (
                            <div style={{ fontSize: '0.7em', color: '#999', marginTop: '4px', lineHeight: '1.2' }}>
                              例: 三振、左安、二ゴロ<br />四球、二塁打、中飛
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            )}

            {/* チーム成績 */}
            <div className="stats-display">
              <div className="stats-row">
                <strong>チーム成績</strong>
                <span>打率: {teamStats.avg}</span>
              </div>
              <div className="stats-row">
                <span>安打: {teamStats.totalHits}</span>
                <span>打数: {teamStats.totalAtBats}</span>
              </div>
              <div className="stats-row">
                <span>四球: {teamStats.totalWalks}</span>
                <span>出塁率: {teamStats.obp}</span>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '15px' }}>
              <button className="btn-reset" onClick={resetGame} style={{ padding: '8px 16px' }}>
                試合記録リセット
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
