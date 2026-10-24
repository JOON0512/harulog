import { z } from 'zod';
export const daySchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v+'T12:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===v&&v>='2000-01-01'&&v<='2100-12-31'},'날짜를 확인해 주세요.');
export const taskCreateSchema=z.object({id:z.string().uuid(),title:z.string().trim().min(1).max(160),date:daySchema,category:z.enum(['focus','life','other']),visibility:z.enum(['private','friends']).default('private')}).strict();
export const taskUpdateSchema=z.object({id:z.string().uuid(),title:z.string().trim().min(1).max(160).optional(),date:daySchema.optional(),category:z.enum(['focus','life','other']).optional(),visibility:z.enum(['private','friends']).optional(),completed:z.boolean().optional()}).strict().refine(v=>Object.keys(v).length>1);
export const idSchema=z.object({id:z.string().uuid()}).strict();
export const profileSchema=z.object({nickname:z.string().trim().min(1).max(20)}).strict();
export const friendSchema=z.object({code:z.string().trim().transform(v=>v.toUpperCase()).pipe(z.string().regex(/^[A-F0-9]{12}$/))}).strict();
