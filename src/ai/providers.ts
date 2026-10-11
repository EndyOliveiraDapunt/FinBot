import OpenAI from 'openai';
import { env } from '../config/env.js';

export interface ProviderCallConfig {
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  tools?: OpenAI.Chat.ChatCompletionTool[];
  temperature?: number;
}

export interface ProviderCallResult {
  message: OpenAI.Chat.ChatCompletionMessage;
  provider: 'gemini' | 'openrouter' | 'fallback';
  model: string;
}

export class AIProviderManager {
  private geminiClient: OpenAI | null = null;
  private openRouterClient: OpenAI | null = null;

  constructor() {
    if (env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'sua_chave_gemini_aqui' && env.GEMINI_API_KEY.length > 5) {
      this.geminiClient = new OpenAI({
        apiKey: env.GEMINI_API_KEY,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      });
    }

    if (env.OPENROUTER_API_KEY && env.OPENROUTER_API_KEY.length > 5) {
      this.openRouterClient = new OpenAI({
        apiKey: env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'https://finbot.app',
          'X-Title': 'FinBot SaaS',
        },
      });
    }
  }

  public async chatCompletion(config: ProviderCallConfig): Promise<ProviderCallResult> {
    const { messages, tools, temperature = 0.2 } = config;

    // 1. Tenta Gemini primeiro
    if (this.geminiClient) {
      try {
        const response = await this.geminiClient.chat.completions.create({
          model: env.GEMINI_MODEL,
          messages,
          tools: tools && tools.length > 0 ? tools : undefined,
          tool_choice: tools && tools.length > 0 ? 'auto' : undefined,
          temperature,
        });

        const choice = response.choices[0];
        if (choice && choice.message) {
          return {
            message: choice.message,
            provider: 'gemini',
            model: env.GEMINI_MODEL,
          };
        }
      } catch (err: any) {
        console.warn('⚠️ Falha no provedor principal Gemini:', err.message);
      }
    }

    // 2. Fallback para OpenRouter
    if (this.openRouterClient) {
      try {
        const response = await this.openRouterClient.chat.completions.create({
          model: env.OPENROUTER_MODEL,
          messages,
          tools: tools && tools.length > 0 ? tools : undefined,
          tool_choice: tools && tools.length > 0 ? 'auto' : undefined,
          temperature,
        });

        const choice = response.choices[0];
        if (choice && choice.message) {
          return {
            message: choice.message,
            provider: 'openrouter',
            model: env.OPENROUTER_MODEL,
          };
        }
      } catch (err: any) {
        console.warn('⚠️ Falha no provedor de reserva OpenRouter:', err.message);
      }
    }

    throw new Error('Nenhum provedor de IA disponível ou ambos falharam.');
  }
}

export const aiProviders = new AIProviderManager();
