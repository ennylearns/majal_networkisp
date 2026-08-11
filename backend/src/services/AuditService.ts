import { Pool } from 'pg';

export class AuditService {
    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    async logAction(
        adminId: number | null,
        actionType: string,
        targetEntity: string,
        targetEntityId: number | null,
        metadata: any = {}
    ): Promise<void> {
        try {
            await this.pool.query(
                `INSERT INTO audit_logs (admin_id, action_type, target_entity, target_entity_id, metadata)
                 VALUES ($1, $2, $3, $4, $5)`,
                [adminId, actionType, targetEntity, targetEntityId, metadata]
            );
        } catch (error) {
            console.error('Failed to log audit action:', error);
            // Non-blocking, so we don't throw here to avoid disrupting the main flow
        }
    }

    async getLogs(filters: { actionType?: string, targetEntity?: string, adminId?: number, limit?: number, offset?: number } = {}): Promise<any[]> {
        const conditions: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (filters.actionType) {
            conditions.push(`action_type = $${paramIndex++}`);
            values.push(filters.actionType);
        }
        if (filters.targetEntity) {
            conditions.push(`target_entity = $${paramIndex++}`);
            values.push(filters.targetEntity);
        }
        if (filters.adminId) {
            conditions.push(`admin_id = $${paramIndex++}`);
            values.push(filters.adminId);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const limit = filters.limit || 50;
        const offset = filters.offset || 0;

        values.push(limit);
        const limitIndex = paramIndex++;
        values.push(offset);
        const offsetIndex = paramIndex++;

        const query = `
            SELECT id, admin_id, action_type, target_entity, target_entity_id, metadata, created_at
            FROM audit_logs
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${limitIndex} OFFSET $${offsetIndex}
        `;

        const result = await this.pool.query(query, values);
        return result.rows;
    }
}
