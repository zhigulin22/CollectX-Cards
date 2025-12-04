import { env } from '../config/env.js';
import { createServiceLogger } from '../utils/logger.js';

const logger = createServiceLogger('Notification');

interface TelegramMessage {
  chatId: string | number;
  text: string;
  parseMode?: 'HTML' | 'Markdown';
}

class NotificationService {
  private botToken: string | undefined;
  private apiUrl: string;

  constructor() {
    this.botToken = env.TELEGRAM_BOT_TOKEN;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  private async sendTelegramMessage(msg: TelegramMessage): Promise<boolean> {
    if (!this.botToken) {
      logger.debug('Bot token not set, skipping notification');
      return false;
    }

    try {
      const response = await fetch(`${this.apiUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: msg.chatId,
          text: msg.text,
          parse_mode: msg.parseMode || 'HTML',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Telegram API error', new Error(errorText), { chatId: msg.chatId });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to send notification', error, { chatId: msg.chatId });
      return false;
    }
  }

  // Уведомление о депозите
  async notifyDeposit(telegramId: string, amount: string, currency: string): Promise<void> {
    await this.sendTelegramMessage({
      chatId: telegramId,
      text: `💰 <b>Deposit received!</b>\n\n+${amount} ${currency}\n\nYour balance has been updated.`,
    });
  }

  // Уведомление о получении перевода
  async notifyReceived(
    telegramId: string, 
    amount: string, 
    senderName: string
  ): Promise<void> {
    await this.sendTelegramMessage({
      chatId: telegramId,
      text: `📥 <b>You received ${amount} $X</b>\n\nFrom: ${senderName}`,
    });
  }

  // Уведомление об успешной отправке
  async notifySent(
    telegramId: string, 
    amount: string, 
    recipientName: string
  ): Promise<void> {
    await this.sendTelegramMessage({
      chatId: telegramId,
      text: `📤 <b>Successfully sent ${amount} $X</b>\n\nTo: ${recipientName}`,
    });
  }

  // Уведомление о выводе
  async notifyWithdraw(
    telegramId: string, 
    amount: string, 
    address: string,
    status: 'pending' | 'completed' | 'failed'
  ): Promise<void> {
    const statusEmoji = {
      pending: '⏳',
      completed: '✅',
      failed: '❌',
    };

    const statusText = {
      pending: 'Processing',
      completed: 'Completed',
      failed: 'Failed',
    };

    await this.sendTelegramMessage({
      chatId: telegramId,
      text: `${statusEmoji[status]} <b>Withdrawal ${statusText[status]}</b>\n\nAmount: ${amount} USDT\nTo: <code>${address}</code>`,
    });
  }

  // Уведомление о свопе
  async notifySwap(
    telegramId: string,
    fromAmount: string,
    fromCurrency: string,
    toAmount: string,
    toCurrency: string
  ): Promise<void> {
    await this.sendTelegramMessage({
      chatId: telegramId,
      text: `🔄 <b>Swap completed!</b>\n\n${fromAmount} ${fromCurrency} → ${toAmount} ${toCurrency}`,
    });
  }
}

export const notificationService = new NotificationService();


