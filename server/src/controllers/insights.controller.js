import { Enquiry } from '../models/Enquiry.js';
import { User } from '../models/User.js';
import { Call } from '../models/Call.js';
import { Progress } from '../models/Progress.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

const ENQUIRY_STATUSES = ['new', 'contacted', 'follow-up', 'converted', 'closed'];
const GROWTH_WEEKS = 8;

// UTC-based deliberately: MongoDB's $dateTrunc below buckets in UTC by default, and the two
// sides' week-start dates must line up exactly for countByWeek's string-keyed lookup to match.
// A local-time version of this (as used for startOfDay/endOfDay above) silently produced a
// timestamp offset from true UTC midnight by the server's UTC offset, so every week bucket
// missed MongoDB's UTC-truncated boundary and the whole chart read zero — caught by testing
// live with real data, not by reading the code.
function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
}

export const adminOverview = asyncHandler(async (req, res) => {
  const [newEnquiries, converted, totalEnquiries, activeClients, dietitians, statusCounts] = await Promise.all([
    Enquiry.countDocuments({ status: 'new' }),
    Enquiry.countDocuments({ status: 'converted' }),
    Enquiry.countDocuments(),
    User.countDocuments({ role: 'client' }),
    User.find({ role: 'dietitian' }),
    Enquiry.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const followUpsToday = await Call.countDocuments({
    scheduledAt: { $gte: startOfDay(), $lte: endOfDay() },
    status: 'scheduled',
  });

  const dietitianWorkload = await Promise.all(
    dietitians.map(async (d) => ({
      dietitian: d.name,
      clients: await User.countDocuments({ role: 'client', assignedDietitian: d.id }),
    }))
  );

  // Real weekly enquiry volume for the last GROWTH_WEEKS weeks (including weeks with zero
  // enquiries, so the chart's x-axis is a continuous timeline, not just weeks that had activity).
  const earliestWeek = startOfWeek(new Date(Date.now() - (GROWTH_WEEKS - 1) * 7 * 24 * 60 * 60 * 1000));
  const weeklyCounts = await Enquiry.aggregate([
    { $match: { createdAt: { $gte: earliestWeek } } },
    {
      $group: {
        _id: { $dateTrunc: { date: '$createdAt', unit: 'week', startOfWeek: 'monday', timezone: 'UTC' } },
        count: { $sum: 1 },
      },
    },
  ]);
  const countByWeek = new Map(weeklyCounts.map((w) => [w._id.toISOString().slice(0, 10), w.count]));
  const growthSeries = Array.from({ length: GROWTH_WEEKS }, (_, i) => {
    const week = new Date(earliestWeek.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const key = week.toISOString().slice(0, 10);
    return { week: key, enquiries: countByWeek.get(key) ?? 0 };
  });

  const countByStatus = new Map(statusCounts.map((s) => [s._id, s.count]));
  const statusBreakdown = ENQUIRY_STATUSES.map((status) => ({ status, count: countByStatus.get(status) ?? 0 }));

  res.json({
    newEnquiries,
    followUpsToday,
    conversionRate: totalEnquiries ? Math.round((converted / totalEnquiries) * 1000) / 10 : 0,
    activeClients,
    growthSeries,
    dietitianWorkload,
    statusBreakdown,
  });
});

export const dietitianOverview = asyncHandler(async (req, res) => {
  const todaysAppointments = await Call.find({
    dietitian: req.user.id,
    scheduledAt: { $gte: startOfDay(), $lte: endOfDay() },
  }).populate('client', 'name');

  const clientIds = await User.find({ role: 'client', assignedDietitian: req.user.id }).distinct('_id');
  const clientMomentum = await Progress.aggregate([
    { $match: { client: { $in: clientIds } } },
    { $sort: { date: -1 } },
    { $group: { _id: '$client', latest: { $first: '$$ROOT' } } },
  ]);

  res.json({ todaysAppointments, attentionItems: [], clientMomentum: clientMomentum.length });
});
