// 실시간 통신을 위한 WebSocket 클라이언트 유틸리티

export class WebSocketClient {
  private socket: WebSocket | null = null
  private roomId: string
  private playerId: string
  private callbacks: Record<string, (data: any) => void> = {}

  constructor(roomId: string, playerId: string) {
    this.roomId = roomId
    this.playerId = playerId
  }

  connect() {
    // 실제 배포 환경에서는 적절한 WebSocket 서버 URL로 변경
    const wsUrl = process.env.NODE_ENV === "production" ? `wss://${window.location.host}/ws` : "ws://localhost:3001/ws"

    this.socket = new WebSocket(wsUrl)

    this.socket.onopen = () => {
      console.log("WebSocket 연결 성공")
      this.send("join", { roomId: this.roomId, playerId: this.playerId })
    }

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        const { type, data } = message

        if (this.callbacks[type]) {
          this.callbacks[type](data)
        }
      } catch (error) {
        console.error("WebSocket 메시지 처리 오류:", error)
      }
    }

    this.socket.onclose = () => {
      console.log("WebSocket 연결 종료")
    }

    this.socket.onerror = (error) => {
      console.error("WebSocket 오류:", error)
    }
  }

  send(type: string, data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type,
          data: {
            ...data,
            roomId: this.roomId,
            playerId: this.playerId,
          },
        }),
      )
    }
  }

  on(type: string, callback: (data: any) => void) {
    this.callbacks[type] = callback
  }

  disconnect() {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }
}
