import { EventEmitter } from 'events';
import WebSocket from 'ws';

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  timestamp?: number;
}

export interface ToolCall {
  id: string;
  name: string;
  args: any;
  result?: any;
  status?: 'pending' | 'running' | 'completed' | 'failed';
}

export interface SendMessageOptions {
  agentMode?: string;
  stream?: boolean;
  context?: string[];
}

export interface GridCLIClientConfig {
  model?: string;
  provider?: string;
  apiKey?: string;
  wsUrl?: string;
}

/**
 * Client for communicating with GRID's chat and agent services
 * Can connect via WebSocket for real-time streaming or HTTP for simple requests
 */
export class GridCLIClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: GridCLIClientConfig;
  private messageHistory: Message[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(config: GridCLIClientConfig = {}) {
    super();
    this.config = {
      wsUrl: config.wsUrl || 'ws://localhost:9000/grid-ws',
      ...config,
    };
  }

  /**
   * Connect to GRID via WebSocket for streaming responses
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.wsUrl!);

        this.ws.on('open', () => {
          this.reconnectAttempts = 0;
          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            this.emit('error', error);
          }
        });

        this.ws.on('close', () => {
          this.emit('disconnected');
          this.attemptReconnect();
        });

        this.ws.on('error', (error) => {
          this.emit('error', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from GRID
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send a message to GRID
   */
  async sendMessage(content: string, options: SendMessageOptions = {}): Promise<Message> {
    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    this.messageHistory.push(userMessage);

    if (options.stream && this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Streaming via WebSocket
      return this.sendStreamingMessage(userMessage, options);
    } else {
      // Non-streaming fallback (for headless mode or when WS not available)
      return this.sendHTTPMessage(userMessage, options);
    }
  }

  /**
   * Send a streaming message via WebSocket
   */
  private async sendStreamingMessage(
    message: Message,
    options: SendMessageOptions
  ): Promise<Message> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        return reject(new Error('WebSocket not connected'));
      }

      const requestId = Math.random().toString(36).substring(7);
      let assistantMessage: Message = {
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

      const messageHandler = (data: any) => {
        if (data.requestId === requestId) {
          switch (data.type) {
            case 'delta':
              assistantMessage.content += data.delta;
              this.emit('message:delta', data.delta);
              break;

            case 'tool_call':
              if (!assistantMessage.toolCalls) {
                assistantMessage.toolCalls = [];
              }
              assistantMessage.toolCalls.push(data.toolCall);
              this.emit('tool:call', data.toolCall);
              break;

            case 'tool_result':
              const toolCall = assistantMessage.toolCalls?.find(
                (tc) => tc.id === data.toolCallId
              );
              if (toolCall) {
                toolCall.result = data.result;
                toolCall.status = 'completed';
              }
              this.emit('tool:result', data);
              break;

            case 'complete':
              this.messageHistory.push(assistantMessage);
              this.emit('message:complete', assistantMessage);
              resolve(assistantMessage);
              break;

            case 'error':
              this.emit('message:error', data.error);
              reject(new Error(data.error));
              break;
          }
        }
      };

      // Send the request
      this.ws.send(
        JSON.stringify({
          type: 'chat',
          requestId,
          message,
          options,
          history: this.messageHistory,
        })
      );

      // Listen for responses
      this.on('ws:message', messageHandler);

      // Cleanup listener after completion
      this.once('message:complete', () => {
        this.off('ws:message', messageHandler);
      });
    });
  }

  /**
   * Send a non-streaming message via HTTP (fallback for headless mode)
   */
  private async sendHTTPMessage(
    message: Message,
    options: SendMessageOptions
  ): Promise<Message> {
    // This would typically make an HTTP request to GRID's HTTP API
    // For now, we'll simulate a response (in real implementation, use fetch/axios)

    // Simulated response for demonstration
    // TODO: Replace with actual HTTP call to GRID backend
    return new Promise((resolve) => {
      setTimeout(() => {
        const assistantMessage: Message = {
          role: 'assistant',
          content: `[CLI Mode] Response to: ${message.content}`,
          timestamp: Date.now(),
        };
        this.messageHistory.push(assistantMessage);
        resolve(assistantMessage);
      }, 1000);
    });
  }

  /**
   * Get message history
   */
  getHistory(): Message[] {
    return [...this.messageHistory];
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.messageHistory = [];
    this.emit('history:cleared');
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: any): void {
    this.emit('ws:message', message);
  }

  /**
   * Attempt to reconnect to WebSocket
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

      setTimeout(() => {
        this.connect().catch(() => {
          // Reconnect failed, will try again if under max attempts
        });
      }, delay);
    } else {
      this.emit('reconnect:failed');
    }
  }
}
