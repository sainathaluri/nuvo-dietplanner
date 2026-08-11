import { User } from '../models/User.js';
import { ApiError } from './ApiError.js';

// A dietitian querying `?client=<id>` may only ever see clients assigned to them — admins
// bypass. Route-level `authorize()` already keeps plain clients out of this path entirely.
export async function assertDietitianOwnsClient(req, clientId) {
  if (req.user.role !== 'dietitian') return;

  const client = await User.findById(clientId);
  if (!client || String(client.assignedDietitian) !== req.user.id) throw ApiError.forbidden();
}
