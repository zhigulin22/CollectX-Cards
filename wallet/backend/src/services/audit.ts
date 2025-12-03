import { db } from '../db.js';
import { createServiceLogger } from '../utils/logger.js';

const logger = createServiceLogger('Audit');

export type AuditAction = 
  | 'BALANCE_ADJUST'
  | 'WITHDRAW_APPROVE'
  | 'WITHDRAW_REJECT'
  | 'SETTINGS_UPDATE'
  | 'USER_VIEW'
  | 'USER_BLOCK'
  | 'USER_UNBLOCK'
  | 'USER_NOTES_UPDATE';

interface AuditLogEntry {
  actor: string;
  action: AuditAction;
  targetType?: 'user' | 'withdraw' | 'settings';
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

class AuditService {
  /**
   * Записать действие в аудит-лог
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await db.auditLog.create({
        data: {
          actor: entry.actor,
          action: entry.action,
          targetType: entry.targetType,
          targetId: entry.targetId,
          details: entry.details ? JSON.stringify(entry.details) : null,
          ipAddress: entry.ipAddress,
        },
      });
    } catch (error) {
      // Не ломаем основной flow если аудит не записался
      logger.error('Failed to write audit log', error, { action: entry.action });
    }
  }

  /**
   * Получить записи аудит-лога
   */
  async getEntries(options: {
    actor?: string;
    action?: string;
    targetId?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const { actor, action, targetId, limit = 50, offset = 0 } = options;

    const where: any = {};
    if (actor) where.actor = actor;
    if (action) where.action = action;
    if (targetId) where.targetId = targetId;

    const [entries, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      db.auditLog.count({ where }),
    ]);

    return {
      items: entries.map((e) => ({
        id: e.id,
        actor: e.actor,
        action: e.action,
        targetType: e.targetType,
        targetId: e.targetId,
        details: e.details ? JSON.parse(e.details) : null,
        ipAddress: e.ipAddress,
        createdAt: e.createdAt.toISOString(),
      })),
      total,
    };
  }
}

export const auditService = new AuditService();

