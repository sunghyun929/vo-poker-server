import { type NextRequest, NextResponse } from "next/server"

// 게임 상태를 저장할 메모리 저장소 (실제로는 데이터베이스 사용)
const gameRooms: Record<string, any> = {}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { action, roomId, playerId, gameState } = data

    // 액션에 따라 처리
    switch (action) {
      case "createRoom":
        // 새 게임방 생성
        gameRooms[roomId] = {
          gameState: {
            players: [],
            communityCards: [],
            pot: 0,
            currentBet: 0,
            gamePhase: "waiting",
            activePlayerIndex: 0,
            dealerIndex: 0,
            smallBlind: 5,
            bigBlind: 10,
            lastRaiseIndex: -1,
            roundComplete: false,
            lastUpdate: Date.now(),
          },
        }
        return NextResponse.json({ success: true, roomId })

      case "joinRoom":
        // 방에 플레이어 참가
        if (!gameRooms[roomId]) {
          return NextResponse.json({ success: false, error: "존재하지 않는 방입니다." }, { status: 404 })
        }

        const room = gameRooms[roomId]
        const existingPlayer = room.gameState.players.find((p: any) => p.name === data.playerName)

        if (existingPlayer) {
          return NextResponse.json({ success: false, error: "이미 존재하는 플레이어 이름입니다." }, { status: 400 })
        }

        if (room.gameState.players.length >= 8) {
          return NextResponse.json({ success: false, error: "방이 가득 찼습니다." }, { status: 400 })
        }

        room.gameState.players.push({
          id: playerId,
          name: data.playerName,
          chips: 1000,
          cards: [],
          currentBet: 0,
          folded: false,
          position: room.gameState.players.length,
          isDealer: room.gameState.players.length === 0,
          isActive: false,
        })

        room.gameState.lastUpdate = Date.now()

        return NextResponse.json({ success: true })

      case "updateGameState":
        // 게임 상태 업데이트
        if (!gameRooms[roomId]) {
          return NextResponse.json({ success: false, error: "존재하지 않는 방입니다." }, { status: 404 })
        }

        gameRooms[roomId].gameState = { ...gameState, lastUpdate: Date.now() }
        return NextResponse.json({ success: true })

      case "getGameState":
        // 게임 상태 조회
        if (!gameRooms[roomId]) {
          return NextResponse.json({ success: false, error: "존재하지 않는 방입니다." }, { status: 404 })
        }

        return NextResponse.json({ success: true, gameState: gameRooms[roomId].gameState })

      default:
        return NextResponse.json({ success: false, error: "지원하지 않는 액션입니다." }, { status: 400 })
    }
  } catch (error) {
    console.error("게임 API 오류:", error)
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다." }, { status: 500 })
  }
}
