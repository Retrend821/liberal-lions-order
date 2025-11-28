'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Player = {
  name: string
  pos: string
  face: string
}

type BenchPlayer = {
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
  gameState: GameState
}

const POSITION_CLASSES: { [key: string]: string } = {
  "中": "bg-green-300", "左": "bg-green-300", "右": "bg-green-300",
  "二": "bg-yellow-300", "三": "bg-yellow-300", "一": "bg-yellow-300", "遊": "bg-yellow-300",
  "捕": "bg-blue-300", "投": "bg-red-300", "DH": "bg-purple-300"
}

const FACE_OPTIONS = [
  { emoji: '🤩', label: '絶好調', class: 'bg-pink-400' },
  { emoji: '😊', label: '好調', class: 'bg-red-400' },
  { emoji: '😐', label: 'ふつう', class: 'bg-yellow-400' },
  { emoji: '😰', label: '不調', class: 'bg-blue-400' },
  { emoji: '🤢', label: '絶不調', class: 'bg-purple-400' }
]

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([])
  const [benchPitchers, setBenchPitchers] = useState<BenchPlayer[]>([])
  const [benchCatchers, setBenchCatchers] = useState<BenchPlayer[]>([])
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
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [openFaceDropdown, setOpenFaceDropdown] = useState<string | null>(null)
  const [dataId, setDataId] = useState<string | null>(null)

  // 初回読み込み
  useEffect(() => {
    loadData()
  }, [])

  // 保存トースト表示
  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 2000)
  }

  // データ読み込み
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
      setGameState(orderData.gameState || {
        inning: 1,
        isTopHalf: true,
        currentBatterIndex: 0,
        battingStats: {}
      })
    }
    setLoading(false)
  }

  // データ保存
  const saveData = async (showMessage = true) => {
    if (!dataId) return

    const orderData: OrderData = {
      players,
      benchPitchers,
      benchCatchers,
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

  // 選手追加
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

  // 控えピッチャー追加
  const addBenchPitcher = () => {
    if (!benchPitcherName.trim()) {
      alert('控え投手名を入力してください')
      return
    }
    setBenchPitchers([...benchPitchers, { name: benchPitcherName.trim(), face: '😊' }])
    setBenchPitcherName('')
  }

  // 控えキャッチャー追加
  const addBenchCatcher = () => {
    if (!benchCatcherName.trim()) {
      alert('控え捕手名を入力してください')
      return
    }
    setBenchCatchers([...benchCatchers, { name: benchCatcherName.trim(), face: '😊' }])
    setBenchCatcherName('')
  }

  // 選手削除
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

  // 選手移動
  const movePlayer = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= players.length) return

    const newPlayers = [...players]
    ;[newPlayers[index], newPlayers[newIndex]] = [newPlayers[newIndex], newPlayers[index]]

    const newBattingStats = { ...gameState.battingStats }
    const tempStats = newBattingStats[index]
    newBattingStats[index] = newBattingStats[newIndex]
    newBattingStats[newIndex] = tempStats

    setPlayers(newPlayers)
    setGameState({ ...gameState, battingStats: newBattingStats })
  }

  // ポジション変更
  const changePosition = (index: number, newPos: string) => {
    const newPlayers = [...players]
    newPlayers[index].pos = newPos
    setPlayers(newPlayers)
  }

  // 顔変更
  const changeFace = (index: number, newFace: string, type: 'player' | 'pitcher' | 'catcher') => {
    if (type === 'player') {
      const newPlayers = [...players]
      newPlayers[index].face = newFace
      setPlayers(newPlayers)
    } else if (type === 'pitcher') {
      const newBench = [...benchPitchers]
      newBench[index].face = newFace
      setBenchPitchers(newBench)
    } else {
      const newBench = [...benchCatchers]
      newBench[index].face = newFace
      setBenchCatchers(newBench)
    }
    setOpenFaceDropdown(null)
  }

  // 打撃結果更新
  const updateBattingResult = (playerIndex: number, atBatIndex: number, result: string) => {
    const newBattingStats = { ...gameState.battingStats }
    if (!newBattingStats[playerIndex]) {
      newBattingStats[playerIndex] = { hits: 0, atBats: 0, walks: 0, results: [] }
    }

    const stats = { ...newBattingStats[playerIndex] }
    const oldResult = stats.results[atBatIndex]

    // 古い結果を取り消し
    if (oldResult) {
      const oldNormalized = normalizeResult(oldResult)
      updateStatsForResult(stats, oldNormalized, -1)
    }

    // 新しい結果を反映
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

  // 結果を正規化
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

  // 統計更新
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

  // チーム統計計算
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

  // 試合リセット
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

  // 全削除
  const clearAll = async () => {
    if (confirm('全てのデータを削除しますか？')) {
      setPlayers([])
      setBenchPitchers([])
      setBenchCatchers([])
      setGameState({
        inning: 1,
        isTopHalf: true,
        currentBatterIndex: 0,
        battingStats: {}
      })
    }
  }

  // 自動保存
  useEffect(() => {
    if (!loading && dataId) {
      const timer = setTimeout(() => {
        saveData(false)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [players, benchPitchers, benchCatchers, gameState])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white flex items-center justify-center">
        <div className="text-xl font-bold">読み込み中...</div>
      </div>
    )
  }

  const teamStats = getTeamStats()

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white p-4" onClick={() => setOpenFaceDropdown(null)}>
      {/* トースト */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-full shadow-lg font-bold z-50">
          {toast}
        </div>
      )}

      {/* ヘッダー */}
      <div className="max-w-md mx-auto mb-4">
        <div className="bg-gradient-to-br from-blue-900 to-blue-950 border-4 border-white rounded-2xl p-5 text-center shadow-lg">
          <span className="inline-block bg-red-600 text-white px-4 py-1 rounded-full text-sm font-bold mb-2 border-2 border-white">
            LIBERAL
          </span>
          <div className="text-4xl font-black text-white italic" style={{ textShadow: '3px 3px 0 #dc143c' }}>
            Lions
          </div>
        </div>
      </div>

      {/* タブ */}
      <div className="max-w-md mx-auto flex bg-white rounded-t-xl overflow-hidden shadow">
        <button
          onClick={() => setCurrentTab('order')}
          className={`flex-1 py-3 font-bold transition ${currentTab === 'order' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          オーダー編集
        </button>
        <button
          onClick={() => setCurrentTab('game')}
          className={`flex-1 py-3 font-bold transition ${currentTab === 'game' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          試合記録
        </button>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-md mx-auto bg-white border-4 border-blue-600 rounded-b-2xl p-4">
        {currentTab === 'order' ? (
          <>
            {/* オーダー編集タブ */}
            <div className="bg-blue-600 text-white text-center py-2 rounded-lg font-bold mb-4">
              スターティングオーダー
            </div>

            {/* 選手追加フォーム */}
            <div className="flex gap-2 justify-center mb-4">
              <input
                type="text"
                placeholder="選手名"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
                className="border-2 border-gray-300 rounded-lg px-3 py-2 w-32"
              />
              <select
                value={playerPos}
                onChange={(e) => setPlayerPos(e.target.value)}
                className="border-2 border-gray-300 rounded-lg px-2 py-2"
              >
                {['投', '捕', '一', '二', '三', '遊', '左', '中', '右', 'DH'].map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
              <button
                onClick={addPlayer}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold"
              >
                追加
              </button>
            </div>

            {/* 選手リスト */}
            <div className="space-y-2 mb-4">
              {players.length === 0 ? (
                <div className="text-center text-gray-500 py-4">選手が登録されていません</div>
              ) : (
                players.map((player, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className={`flex-1 px-3 py-2 rounded-xl font-bold text-center ${POSITION_CLASSES[player.pos] || 'bg-gray-200'}`}>
                      {player.name}
                    </div>
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setOpenFaceDropdown(openFaceDropdown === `player-${index}` ? null : `player-${index}`)}
                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-lg"
                      >
                        {player.face}
                      </button>
                      {openFaceDropdown === `player-${index}` && (
                        <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-white border-2 border-gray-300 rounded-xl p-2 shadow-lg z-10 flex flex-col gap-1">
                          {FACE_OPTIONS.map(face => (
                            <button
                              key={face.emoji}
                              onClick={() => changeFace(index, face.emoji, 'player')}
                              className={`w-10 h-10 rounded-full ${face.class} flex items-center justify-center text-xl`}
                              title={face.label}
                            >
                              {face.emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <select
                      value={player.pos}
                      onChange={(e) => changePosition(index, e.target.value)}
                      className={`border-2 rounded-lg px-2 py-1 font-bold ${POSITION_CLASSES[player.pos] || 'bg-gray-200'}`}
                    >
                      {['投', '捕', '一', '二', '三', '遊', '左', '中', '右', 'DH'].map(pos => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                    <button onClick={() => movePlayer(index, 'up')} className="w-8 h-8 bg-gray-600 text-white rounded font-bold">↑</button>
                    <button onClick={() => movePlayer(index, 'down')} className="w-8 h-8 bg-gray-600 text-white rounded font-bold">↓</button>
                    <button onClick={() => deletePlayer(index)} className="w-8 h-8 bg-red-500 text-white rounded font-bold">×</button>
                  </div>
                ))
              )}
            </div>

            {/* 控えピッチャー */}
            <div className="bg-gray-600 text-white text-center py-2 rounded-lg font-bold mb-2">控えピッチャー</div>
            <div className="flex gap-2 justify-center mb-2">
              <input
                type="text"
                placeholder="控え投手名"
                value={benchPitcherName}
                onChange={(e) => setBenchPitcherName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addBenchPitcher()}
                className="border-2 border-gray-300 rounded-lg px-3 py-2 flex-1"
              />
              <button onClick={addBenchPitcher} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">追加</button>
            </div>
            <div className="space-y-2 mb-4">
              {benchPitchers.map((player, index) => (
                <div key={index} className="flex items-center gap-2 bg-gray-100 p-2 rounded-lg">
                  <div className="w-8 h-8 bg-gray-600 text-white rounded-full flex items-center justify-center font-bold text-xs">P{index + 1}</div>
                  <div className="flex-1 px-3 py-2 rounded-xl font-bold text-center bg-red-300">{player.name}</div>
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setOpenFaceDropdown(openFaceDropdown === `pitcher-${index}` ? null : `pitcher-${index}`)}
                      className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-lg"
                    >
                      {player.face}
                    </button>
                    {openFaceDropdown === `pitcher-${index}` && (
                      <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-white border-2 border-gray-300 rounded-xl p-2 shadow-lg z-10 flex flex-col gap-1">
                        {FACE_OPTIONS.map(face => (
                          <button
                            key={face.emoji}
                            onClick={() => changeFace(index, face.emoji, 'pitcher')}
                            className={`w-10 h-10 rounded-full ${face.class} flex items-center justify-center text-xl`}
                          >
                            {face.emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => {
                    if (confirm(`${player.name}を削除しますか？`)) {
                      setBenchPitchers(benchPitchers.filter((_, i) => i !== index))
                    }
                  }} className="w-8 h-8 bg-red-500 text-white rounded font-bold">×</button>
                </div>
              ))}
            </div>

            {/* 控えキャッチャー */}
            <div className="bg-gray-600 text-white text-center py-2 rounded-lg font-bold mb-2">控えキャッチャー</div>
            <div className="flex gap-2 justify-center mb-2">
              <input
                type="text"
                placeholder="控え捕手名"
                value={benchCatcherName}
                onChange={(e) => setBenchCatcherName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addBenchCatcher()}
                className="border-2 border-gray-300 rounded-lg px-3 py-2 flex-1"
              />
              <button onClick={addBenchCatcher} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">追加</button>
            </div>
            <div className="space-y-2 mb-4">
              {benchCatchers.map((player, index) => (
                <div key={index} className="flex items-center gap-2 bg-gray-100 p-2 rounded-lg">
                  <div className="w-8 h-8 bg-gray-600 text-white rounded-full flex items-center justify-center font-bold text-xs">C{index + 1}</div>
                  <div className="flex-1 px-3 py-2 rounded-xl font-bold text-center bg-blue-300">{player.name}</div>
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setOpenFaceDropdown(openFaceDropdown === `catcher-${index}` ? null : `catcher-${index}`)}
                      className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-lg"
                    >
                      {player.face}
                    </button>
                    {openFaceDropdown === `catcher-${index}` && (
                      <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-white border-2 border-gray-300 rounded-xl p-2 shadow-lg z-10 flex flex-col gap-1">
                        {FACE_OPTIONS.map(face => (
                          <button
                            key={face.emoji}
                            onClick={() => changeFace(index, face.emoji, 'catcher')}
                            className={`w-10 h-10 rounded-full ${face.class} flex items-center justify-center text-xl`}
                          >
                            {face.emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => {
                    if (confirm(`${player.name}を削除しますか？`)) {
                      setBenchCatchers(benchCatchers.filter((_, i) => i !== index))
                    }
                  }} className="w-8 h-8 bg-red-500 text-white rounded font-bold">×</button>
                </div>
              ))}
            </div>

            {/* ボタン */}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => saveData(true)} className="bg-green-500 text-white py-3 rounded-lg font-bold">💾 保存</button>
              <button onClick={loadData} className="bg-blue-500 text-white py-3 rounded-lg font-bold">📥 読込</button>
              <button onClick={() => {
                navigator.clipboard.writeText(window.location.href)
                alert('URLをコピーしました！')
              }} className="bg-orange-500 text-white py-3 rounded-lg font-bold">🔗 共有URL</button>
              <button onClick={clearAll} className="bg-red-500 text-white py-3 rounded-lg font-bold">全削除</button>
            </div>
          </>
        ) : (
          <>
            {/* 試合記録タブ */}
            <div className="bg-blue-600 text-white text-center py-2 rounded-lg font-bold mb-4">
              試合記録
            </div>

            {/* イニング表示 */}
            <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-3 mb-4">
              <div className="flex justify-between items-center mb-2">
                <div className="font-bold text-lg">
                  {gameState.inning}回 {gameState.isTopHalf ? '表' : '裏'}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setGameState(prev => {
                      if (!prev.isTopHalf && prev.inning > 1) {
                        return { ...prev, isTopHalf: true }
                      } else if (prev.isTopHalf && prev.inning > 1) {
                        return { ...prev, isTopHalf: false, inning: prev.inning - 1 }
                      }
                      return prev
                    })}
                    className="bg-gray-500 text-white px-3 py-1 rounded text-sm"
                  >
                    前へ
                  </button>
                  <button
                    onClick={() => setGameState(prev => {
                      if (prev.isTopHalf) {
                        return { ...prev, isTopHalf: false }
                      } else {
                        return { ...prev, isTopHalf: true, inning: prev.inning + 1 }
                      }
                    })}
                    className="bg-gray-500 text-white px-3 py-1 rounded text-sm"
                  >
                    次へ
                  </button>
                </div>
              </div>
            </div>

            {/* 選手別打撃記録 */}
            {players.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                選手が登録されていません<br />オーダー編集タブで選手を追加してください
              </div>
            ) : (
              <div className="space-y-4 mb-4">
                {players.map((player, index) => {
                  const stats = gameState.battingStats[index] || { hits: 0, atBats: 0, walks: 0, results: [] }
                  const avg = stats.atBats > 0 ? (stats.hits / stats.atBats).toFixed(3) : '.---'

                  return (
                    <div key={index} className="border-2 border-gray-300 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className={`px-3 py-1 rounded-xl font-bold ${POSITION_CLASSES[player.pos] || 'bg-gray-200'}`}>
                          {player.name}
                        </div>
                        <div className="text-gray-600 text-sm">
                          {stats.hits}/{stats.atBats} 打率 {avg}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[1, 2, 3, 4].map(atBat => (
                          <div key={atBat} className="bg-gray-100 rounded-lg p-2 text-center">
                            <div className="text-xs text-gray-600 mb-1">{atBat}打席目</div>
                            <input
                              type="text"
                              placeholder="結果"
                              value={stats.results[atBat - 1] || ''}
                              onChange={(e) => updateBattingResult(index, atBat - 1, e.target.value)}
                              className="w-full px-2 py-1 border rounded text-center text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* チーム成績 */}
            <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-3 mb-4">
              <div className="font-bold mb-2">チーム成績</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>安打: {teamStats.totalHits}</div>
                <div>打数: {teamStats.totalAtBats}</div>
                <div>四球: {teamStats.totalWalks}</div>
                <div>打率: {teamStats.avg}</div>
                <div>出塁率: {teamStats.obp}</div>
              </div>
            </div>

            <button
              onClick={resetGame}
              className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold"
            >
              試合記録リセット
            </button>
          </>
        )}
      </div>
    </div>
  )
}
