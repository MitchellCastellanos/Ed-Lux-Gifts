import { z } from 'zod';
import { cartSchema } from './cart';
import { normalizePhone } from './phone';
import { normalizePostalCode } from './postal';

/** Error values are i18n codes (see `v.*` in the dictionaries), never raw English strings. */
export const checkoutSchema = z.object({
  cart: cartSchema,
  expectedTotalCents: z.number().int().optional(),
  purchaser: z.object({
    phone: z.string().trim().min(1, 'required').refine((v) => normalizePhone(v).ok, 'phone'),
    name: z.string().trim().min(2, 'required').max(100),
    email: z.string().trim().toLowerCase().email('email').max(160),
    locale: z.enum(['fr', 'en']).default('fr'),
  }),
  delivery: z.object({
    address: z.string().trim().min(3, 'required').max(160),
    unit: z.string().trim().max(30).optional().default(''),
    city: z.string().trim().min(2, 'required').max(80),
    postalCode: z.string().trim().min(1, 'required').refine((v) => normalizePostalCode(v) !== null, 'postal'),
    recipientName: z.string().trim().max(100).optional().default(''),
    recipientPhone: z.string().trim().max(40).optional().default('').refine((v) => v === '' || normalizePhone(v).ok, 'phone'),
    deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'required'),
    instructions: z.string().trim().max(400).optional().default(''),
  }),
  paymentMethod: z.enum(['INTERAC', 'COD_CASH', 'COD_INTERAC']),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'terms' }) }),
  idempotencyKey: z.string().min(16).max(80),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;
