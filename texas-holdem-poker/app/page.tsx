"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, DollarSign, Shuffle, Plus, Minus, Copy, Check } from "lucide-react"

// 카드 타입 정의
type Suit = "♠" | "♥" | "♦" | "♣"
type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K"

interface PlayingCard {
  suit: Suit
  rank: Rank
  id: string
}

interface Player {
  id: string
  name: string
  chips: number
  cards: PlayingCard[]
  currentBet: number
  folded: boolean
  position: number
  isDealer: boolean
  isActive: boolean
}

interface GameState {
  players: Player[]
  communityCards: PlayingCard[]
  pot: number
  currentBet: number
  gamePhase: "waiting" | "preflop" | "flop" | "turn" | "river" | "showdown"
  activePlayerIndex: number
  dealerIndex: number
  smallBlind: number
  bigBlind: number
  lastRaiseIndex: number
  roundComplete: boolean
  lastUpdate: number
}

// 카드 덱 생성
const createDeck = (): PlayingCard[] => {
  const suits: Suit[] = ["♠", "♥", "♦", "♣"]
  const ranks: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
  const deck: PlayingCard[] = []

  suits.forEach((suit) => {
    ranks.forEach((rank) => {
      deck.push({
        suit,
        rank,
        id: `${suit}${rank}`,
      })
    })
  })

  return deck.sort(() => Math.random() - 0.5)
}

// 카드 컴포넌트
const PlayingCardComponent = ({ card, hidden = false }: { card?: PlayingCard; hidden?: boolean }) => {
  if (!card || hidden) {
    return (
      <div className="w-14 h-20 bg-blue-900 border-2 border-blue-700 rounded-lg flex items-center justify-center shadow-lg">
        <div className="w-10 h-14 bg-blue-800 rounded border border-blue-600"></div>
      </div>
    )
  }

  const isRed = card.suit === "♥" || card.suit === "♦"

  return (
    <div className="w-14 h-20 bg-white border-2 border-gray-300 rounded-lg flex flex-col items-center justify-between p-1 shadow-lg">
      <div className={`text-sm font-bold ${isRed ? "text-red-600" : "text-black"}`}>{card.rank}</div>
      <div className={`text-2xl ${isRed ? "text-red-600" : "text-black"}`}>{card.suit}</div>
      <div className={`text-sm font-bold transform rotate-180 ${isRed ? "text-red-600" : "text-black"}`}>
        {card.rank}
      </div>
    </div>
  )
}

// 칩 컴포넌트
const Chip = ({ value, count }: { value: number; count: number }) => {
  const getChipColor = (value: number) => {
    if (value >= 1000) return "bg-purple-600 border-purple-400"
    if (value >= 500) return "bg-pink-600 border-pink-400"
    if (value >= 100) return "bg-black border-gray-600"
    if (value >= 25) return "bg-green-600 border-green-400"
    if (value >= 5) return "bg-red-600 border-red-400"
    return "bg-white border-gray-400 text-black"
  }

  if (count === 0) return null

  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white shadow-lg ${getChipColor(value)}`}
      >
        {value >= 1000 ? `${value / 1000}K` : value}
      </div>
      {count > 1 && <span className="text-xs text-gray-400 mt-1">×{count}</span>}
    </div>
  )
}

// 플레이어 컴포넌트
const PlayerComponent = ({
  player,
  isCurrentPlayer,
  showCards,
  isActivePlayer,
}: {
  player: Player
  isCurrentPlayer: boolean
  showCards: boolean
  isActivePlayer: boolean
}) => {
  const chipStacks = [
    { value: 1000, count: Math.floor(player.chips / 1000) },
    { value: 500, count: Math.floor((player.chips % 1000) / 500) },
    { value: 100, count: Math.floor((player.chips % 500) / 100) },
    { value: 25, count: Math.floor((player.chips % 100) / 25) },
    { value: 5, count: Math.floor((player.chips % 25) / 5) },
    { value: 1, count: player.chips % 5 },
  ].filter((stack) => stack.count > 0)

  return (
    <div
      className={`relative p-3 rounded-lg border-2 transition-all ${
        isActivePlayer
          ? "border-yellow-400 bg-yellow-50 shadow-lg"
          : isCurrentPlayer
            ? "border-blue-400 bg-blue-50"
            : player.folded
              ? "border-gray-400 bg-gray-100 opacity-50"
              : "border-green-600 bg-green-50"
      }`}
    >
      {player.isDealer && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-xs font-bold">
          D
        </div>
      )}

      {isActivePlayer && (
        <div className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
          ▶
        </div>
      )}

      <div className="text-sm font-semibold mb-2">{player.name}</div>

      <div className="flex gap-1 mb-2">
        {player.cards.map((card, index) => (
          <PlayingCardComponent key={index} card={card} hidden={!showCards && !isCurrentPlayer} />
        ))}
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {chipStacks.map((stack, index) => (
          <Chip key={index} value={stack.value} count={stack.count} />
        ))}
      </div>

      <div className="text-xs text-gray-600">
        <div>칩: ${player.chips}</div>
        {player.currentBet > 0 && <div className="font-semibold text-blue-600">베팅: ${player.currentBet}</div>}
        {player.folded && <div className="font-semibold text-red-600">폴드</div>}
      </div>
    </div>
  )
}

export default function TexasHoldemPoker() {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [playerName, setPlayerName] = useState("")
  const [currentPlayerId, setCurrentPlayerId] = useState("")
  const [betAmount, setBetAmount] = useState(10)
  const [roomId, setRoomId] = useState("")
  const [joinRoomId, setJoinRoomId] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [copied, setCopied] = useState(false)

  // 게임 상태 폴링
  const pollGameState = useCallback(async () => {
    if (!roomId || !isConnected) return

    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getGameState",
          roomId: roomId,
        }),
      })

      const data = await response.json()
      if (data.success && data.gameState) {
        setGameState(data.gameState)
      }
    } catch (error) {
      console.error("게임 상태 조회 오류:", error)
    }
  }, [roomId, isConnected])

  // 게임 상태 업데이트
  const updateGameState = async (newGameState: GameState) => {
    if (!roomId) return

    try {
      await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateGameState",
          roomId: roomId,
          gameState: { ...newGameState, lastUpdate: Date.now() },
        }),
      })
    } catch (error) {
      console.error("게임 상태 업데이트 오류:", error)
    }
  }

  // 폴링 설정
  useEffect(() => {
    if (isConnected && roomId) {
      const interval = setInterval(pollGameState, 1000) // 1초마다 폴링
      return () => clearInterval(interval)
    }
  }, [isConnected, roomId, pollGameState])

  // 새 게임방 생성
  const createRoom = async () => {
    if (!playerName.trim()) return

    const newRoomId = "room-" + Math.random().toString(36).substring(2, 9)

    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createRoom",
          roomId: newRoomId,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setRoomId(newRoomId)
        await joinRoom(newRoomId, playerName)
      }
    } catch (error) {
      console.error("방 생성 오류:", error)
    }
  }

  // 게임방 참가
  const joinRoom = async (targetRoomId?: string, targetPlayerName?: string) => {
    const roomToJoin = targetRoomId || joinRoomId
    const nameToUse = targetPlayerName || playerName

    if (!roomToJoin.trim() || !nameToUse.trim()) return

    const playerId = Date.now().toString()

    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "joinRoom",
          roomId: roomToJoin,
          playerId: playerId,
          playerName: nameToUse,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setCurrentPlayerId(playerId)
        setRoomId(roomToJoin)
        setIsConnected(true)
        setPlayerName("")
        setJoinRoomId("")
      } else {
        alert(data.error || "방 참가에 실패했습니다.")
      }
    } catch (error) {
      console.error("방 참가 오류:", error)
      alert("방 참가 중 오류가 발생했습니다.")
    }
  }

  // 게임 시작
  const startGame = async () => {
    if (!gameState || gameState.players.length < 2) return

    const newDeck = createDeck()
    let deckIndex = 0

    const dealerIndex = 0
    const smallBlindIndex = (dealerIndex + 1) % gameState.players.length
    const bigBlindIndex = (dealerIndex + 2) % gameState.players.length
    const firstBetIndex = (bigBlindIndex + 1) % gameState.players.length

    const updatedPlayers = gameState.players.map((player, index) => {
      const newPlayer = {
        ...player,
        cards: [newDeck[deckIndex++], newDeck[deckIndex++]],
        folded: false,
        currentBet: 0,
        isDealer: index === dealerIndex,
      }

      if (index === smallBlindIndex) {
        newPlayer.chips -= gameState.smallBlind
        newPlayer.currentBet = gameState.smallBlind
      }

      if (index === bigBlindIndex) {
        newPlayer.chips -= gameState.bigBlind
        newPlayer.currentBet = gameState.bigBlind
      }

      return newPlayer
    })

    const newGameState: GameState = {
      ...gameState,
      players: updatedPlayers,
      communityCards: [],
      pot: gameState.smallBlind + gameState.bigBlind,
      currentBet: gameState.bigBlind,
      gamePhase: "preflop",
      activePlayerIndex: firstBetIndex,
      dealerIndex: dealerIndex,
      lastRaiseIndex: bigBlindIndex,
      roundComplete: false,
    }

    setGameState(newGameState)
    await updateGameState(newGameState)
  }

  // 플레이어 액션
  const playerAction = async (action: "fold" | "check" | "call" | "bet" | "raise", amount?: number) => {
    if (!gameState) return

    const currentPlayer = gameState.players[gameState.activePlayerIndex]
    if (!currentPlayer || currentPlayer.id !== currentPlayerId) return

    const updatedPlayers = [...gameState.players]
    let newPot = gameState.pot
    let newCurrentBet = gameState.currentBet
    let newLastRaiseIndex = gameState.lastRaiseIndex
    let roundComplete = false

    switch (action) {
      case "fold":
        updatedPlayers[gameState.activePlayerIndex] = {
          ...currentPlayer,
          folded: true,
        }

        const activePlayers = updatedPlayers.filter((p) => !p.folded)
        if (activePlayers.length === 1) {
          const newGameState: GameState = {
            ...gameState,
            players: updatedPlayers,
            pot: newPot,
            gamePhase: "showdown",
          }
          setGameState(newGameState)
          await updateGameState(newGameState)
          return
        }
        break

      case "check":
        if (gameState.currentBet !== currentPlayer.currentBet) return
        break

      case "call":
        const callAmount = gameState.currentBet - currentPlayer.currentBet
        updatedPlayers[gameState.activePlayerIndex] = {
          ...currentPlayer,
          chips: currentPlayer.chips - callAmount,
          currentBet: gameState.currentBet,
        }
        newPot += callAmount
        break

      case "bet":
        if (gameState.currentBet === 0 && amount && amount > 0) {
          updatedPlayers[gameState.activePlayerIndex] = {
            ...currentPlayer,
            chips: currentPlayer.chips - amount,
            currentBet: amount,
          }
          newPot += amount
          newCurrentBet = amount
          newLastRaiseIndex = gameState.activePlayerIndex
        }
        break

      case "raise":
        if (amount && amount > gameState.currentBet) {
          const raiseAmount = amount - currentPlayer.currentBet
          updatedPlayers[gameState.activePlayerIndex] = {
            ...currentPlayer,
            chips: currentPlayer.chips - raiseAmount,
            currentBet: amount,
          }
          newPot += raiseAmount
          newCurrentBet = amount
          newLastRaiseIndex = gameState.activePlayerIndex
        }
        break
    }

    let nextPlayerIndex = (gameState.activePlayerIndex + 1) % gameState.players.length
    while (updatedPlayers[nextPlayerIndex].folded && nextPlayerIndex !== gameState.activePlayerIndex) {
      nextPlayerIndex = (nextPlayerIndex + 1) % gameState.players.length
    }

    if (action !== "fold" && nextPlayerIndex === (newLastRaiseIndex + 1) % gameState.players.length) {
      const allMatched = updatedPlayers.every((p) => p.folded || p.currentBet === newCurrentBet)
      if (allMatched) {
        roundComplete = true
      }
    }

    const newGameState: GameState = {
      ...gameState,
      players: updatedPlayers,
      pot: newPot,
      currentBet: newCurrentBet,
      activePlayerIndex: nextPlayerIndex,
      lastRaiseIndex: newLastRaiseIndex,
      roundComplete: roundComplete,
    }

    setGameState(newGameState)
    await updateGameState(newGameState)

    if (roundComplete) {
      setTimeout(() => nextPhase(newGameState), 2000)
    }
  }

  // 다음 페이즈로 진행
  const nextPhase = async (currentGameState?: GameState) => {
    const stateToUse = currentGameState || gameState
    if (!stateToUse) return

    const newDeck = createDeck()
    let newCommunityCards = [...stateToUse.communityCards]

    let nextActiveIndex = (stateToUse.dealerIndex + 1) % stateToUse.players.length
    while (stateToUse.players[nextActiveIndex].folded && stateToUse.players.length > 1) {
      nextActiveIndex = (nextActiveIndex + 1) % stateToUse.players.length
    }

    let newGameState: GameState

    switch (stateToUse.gamePhase) {
      case "preflop":
        newCommunityCards = [newDeck[0], newDeck[1], newDeck[2]]
        newGameState = {
          ...stateToUse,
          communityCards: newCommunityCards,
          gamePhase: "flop",
          currentBet: 0,
          players: stateToUse.players.map((p) => ({ ...p, currentBet: 0 })),
          activePlayerIndex: nextActiveIndex,
          lastRaiseIndex: -1,
          roundComplete: false,
        }
        break

      case "flop":
        newCommunityCards.push(newDeck[0])
        newGameState = {
          ...stateToUse,
          communityCards: newCommunityCards,
          gamePhase: "turn",
          currentBet: 0,
          players: stateToUse.players.map((p) => ({ ...p, currentBet: 0 })),
          activePlayerIndex: nextActiveIndex,
          lastRaiseIndex: -1,
          roundComplete: false,
        }
        break

      case "turn":
        newCommunityCards.push(newDeck[0])
        newGameState = {
          ...stateToUse,
          communityCards: newCommunityCards,
          gamePhase: "river",
          currentBet: 0,
          players: stateToUse.players.map((p) => ({ ...p, currentBet: 0 })),
          activePlayerIndex: nextActiveIndex,
          lastRaiseIndex: -1,
          roundComplete: false,
        }
        break

      case "river":
        newGameState = {
          ...stateToUse,
          gamePhase: "showdown",
        }
        break

      default:
        return
    }

    setGameState(newGameState)
    await updateGameState(newGameState)
  }

  // 베팅 금액 조절
  const adjustBetAmount = (amount: number) => {
    if (!gameState) return
    const currentPlayer = gameState.players.find((p) => p.id === currentPlayerId)
    if (!currentPlayer) return

    const minBet = gameState.currentBet > 0 ? gameState.currentBet * 2 : gameState.bigBlind
    const newAmount = Math.max(minBet, Math.min(currentPlayer.chips, betAmount + amount))
    setBetAmount(newAmount)
  }

  // 링크 복사
  const copyRoomLink = () => {
    const link = `${window.location.origin}?room=${roomId}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // URL에서 방 ID 확인
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const roomFromUrl = urlParams.get("room")
    if (roomFromUrl) {
      setJoinRoomId(roomFromUrl)
    }
  }, [])

  const currentPlayer = gameState?.players.find((p) => p.id === currentPlayerId)
  const isMyTurn = gameState?.players[gameState.activePlayerIndex]?.id === currentPlayerId

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-900 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold text-center mb-6">🃏 텍사스 홀덤 포커</h1>

            <div className="space-y-4">
              <Input
                placeholder="플레이어 이름 입력"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
              />

              <div className="space-y-2">
                <Button onClick={createRoom} disabled={!playerName.trim()} className="w-full">
                  새 게임방 만들기
                </Button>

                <div className="text-center text-gray-500">또는</div>

                <Input placeholder="방 ID 입력" value={joinRoomId} onChange={(e) => setJoinRoomId(e.target.value)} />

                <Button
                  onClick={() => joinRoom()}
                  disabled={!playerName.trim() || !joinRoomId.trim()}
                  variant="outline"
                  className="w-full"
                >
                  게임방 참가하기
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-900 p-4 flex items-center justify-center">
        <div className="text-white text-xl">게임 로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white mb-2">🃏 텍사스 홀덤 포커</h1>
          <div className="flex justify-center gap-4 text-white">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span>{gameState.players.length}명 참가</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              <span>팟: ${gameState.pot}</span>
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {gameState.gamePhase === "waiting"
                ? "대기중"
                : gameState.gamePhase === "preflop"
                  ? "프리플롭"
                  : gameState.gamePhase === "flop"
                    ? "플롭"
                    : gameState.gamePhase === "turn"
                      ? "턴"
                      : gameState.gamePhase === "river"
                        ? "리버"
                        : "쇼다운"}
            </Badge>
          </div>
          <div className="mt-2 text-white flex items-center justify-center gap-2">
            <span>방 ID: {roomId}</span>
            <Button size="sm" variant="outline" onClick={copyRoomLink}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* 포커 테이블 */}
        <div className="relative">
          <div className="w-full h-[500px] bg-green-700 rounded-[40%] border-8 border-amber-600 relative shadow-2xl overflow-hidden">
            {/* 커뮤니티 카드 */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="flex gap-2 mb-4 justify-center">
                {Array.from({ length: 5 }).map((_, index) => (
                  <PlayingCardComponent
                    key={index}
                    card={gameState.communityCards[index]}
                    hidden={!gameState.communityCards[index]}
                  />
                ))}
              </div>
              <div className="text-center text-white font-bold text-xl bg-green-800 bg-opacity-70 rounded-lg p-2">
                팟: ${gameState.pot}
              </div>
            </div>

            {/* 플레이어 위치 */}
            {gameState.players.map((player, index) => {
              const angle = (index * 360) / Math.max(6, gameState.players.length)
              const radius = 220
              const x = Math.cos(((angle - 90) * Math.PI) / 180) * radius
              const y = Math.sin(((angle - 90) * Math.PI) / 180) * radius

              return (
                <div
                  key={player.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                  }}
                >
                  <PlayerComponent
                    player={player}
                    isCurrentPlayer={player.id === currentPlayerId}
                    showCards={gameState.gamePhase === "showdown"}
                    isActivePlayer={gameState.players[gameState.activePlayerIndex]?.id === player.id}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* 게임 컨트롤 */}
        <div className="mt-6 flex justify-center gap-4">
          {gameState.gamePhase === "waiting" && gameState.players.length >= 2 && (
            <Button onClick={startGame} size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Shuffle className="w-5 h-5 mr-2" />
              게임 시작
            </Button>
          )}

          {gameState.gamePhase === "showdown" && (
            <Button onClick={() => window.location.reload()} size="lg" className="bg-blue-600 hover:bg-blue-700">
              새 게임
            </Button>
          )}
        </div>

        {/* 플레이어 액션 버튼 */}
        {currentPlayer && isMyTurn && gameState.gamePhase !== "waiting" && gameState.gamePhase !== "showdown" && (
          <Card className="mt-6">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                <div className="text-center text-lg font-semibold text-blue-600">당신의 차례입니다!</div>

                <div className="flex gap-4 items-center justify-center">
                  <Button onClick={() => playerAction("fold")} variant="destructive">
                    폴드
                  </Button>

                  {gameState.currentBet === currentPlayer.currentBet ? (
                    <Button onClick={() => playerAction("check")}>체크</Button>
                  ) : (
                    <Button
                      onClick={() => playerAction("call")}
                      disabled={currentPlayer.chips < gameState.currentBet - currentPlayer.currentBet}
                    >
                      콜 (${gameState.currentBet - currentPlayer.currentBet})
                    </Button>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-center font-semibold">베팅 / 레이즈</div>
                  <div className="flex gap-2 items-center justify-center">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => adjustBetAmount(-10)}
                      disabled={
                        betAmount <= (gameState.currentBet > 0 ? gameState.currentBet + 10 : gameState.bigBlind)
                      }
                    >
                      <Minus className="h-4 w-4" />
                    </Button>

                    <div className="w-24 text-center font-bold">${betAmount}</div>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => adjustBetAmount(10)}
                      disabled={betAmount >= currentPlayer.chips}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex gap-2 justify-center">
                    {gameState.currentBet === 0 ? (
                      <Button
                        onClick={() => playerAction("bet", betAmount)}
                        disabled={betAmount <= 0 || betAmount > currentPlayer.chips}
                        className="bg-amber-600 hover:bg-amber-700"
                      >
                        베팅 (${betAmount})
                      </Button>
                    ) : (
                      <Button
                        onClick={() => playerAction("raise", betAmount)}
                        disabled={betAmount <= gameState.currentBet || betAmount > currentPlayer.chips}
                        className="bg-amber-600 hover:bg-amber-700"
                      >
                        레이즈 (${betAmount})
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 게임 정보 */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 space-y-2">
              <div>
                <strong>현재 베팅:</strong> ${gameState.currentBet}
              </div>
              <div>
                <strong>게임 단계:</strong>{" "}
                {gameState.gamePhase === "waiting"
                  ? "플레이어 대기 중"
                  : gameState.gamePhase === "preflop"
                    ? "프리플롭 - 각자 2장의 카드로 베팅"
                    : gameState.gamePhase === "flop"
                      ? "플롭 - 커뮤니티 카드 3장 공개"
                      : gameState.gamePhase === "turn"
                        ? "턴 - 커뮤니티 카드 4번째 공개"
                        : gameState.gamePhase === "river"
                          ? "리버 - 커뮤니티 카드 5번째 공개"
                          : "쇼다운 - 최종 승부"}
              </div>
              <div>
                <strong>친구 초대:</strong> 위의 방 ID를 복사하여 친구들에게 공유하세요!
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
