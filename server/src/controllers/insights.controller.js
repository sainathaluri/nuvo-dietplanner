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

export const adminOverview = asyncHandler(async (req, res) => {
  const [newEnquiries, converted, totalEnquiries, activeClients, dietitians] = await Promise.all([
    Enquiry.countDocuments({ status: 'new' }),
    Enquiry.countDocuments({ status: 'converted' }),
    Enquiry.countDocuments(),
    User.countDocuments({ role: 'client' }),
    User.find({ role: 'dietitian' }),
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

  res.json({
    newEnquiries,
    followUpsToday,
    conversionRate: totalEnquiries ? Math.round((converted / totalEnquiries) * 1000) / 10 : 0,
    activeClients,
    growthSeries: [],
    dietitianWorkload,
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
