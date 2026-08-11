import mongoose from 'mongoose';
import { env } from './config/env.js';
import { User } from './models/User.js';
import { Recipe } from './models/Recipe.js';
import { Plan } from './models/Plan.js';
import { Progress } from './models/Progress.js';
import { Call } from './models/Call.js';
import { Report } from './models/Report.js';
import { hashPassword } from './utils/password.js';

// One known-credential user per role, for local dev and manual portal testing.
// Documented in docs/worklog — re-run any time with `npm run seed` (idempotent: existing
// users are left untouched, never overwritten).
const SEED_USERS = [
  { name: 'Ava Admin', email: 'admin@nourishly.test', password: 'Password123!', role: 'admin' },
  { name: 'Dana Dietitian', email: 'dietitian@nourishly.test', password: 'Password123!', role: 'dietitian' },
  { name: 'Cleo Client', email: 'client@nourishly.test', password: 'Password123!', role: 'client' },
  // A second client with no plan/progress/calls/reports yet — exercises the dietitian screens'
  // empty states (client detail drawer, builder client-select) alongside Cleo's fully-seeded data.
  { name: 'Priya Shah', email: 'client2@nourishly.test', password: 'Password123!', role: 'client' },
];

const SEED_RECIPES = [
  {
    title: 'Berry & chia breakfast bowl',
    emoji: '🥣',
    mealType: 'Breakfast',
    prepTime: '10 min',
    tags: ['High protein', 'Vegetarian'],
    kcal: 320,
    protein: 18,
    ingredients: 'Greek yogurt, mixed berries, chia seeds, almonds, a drizzle of honey.',
    instructions: 'Layer yogurt and berries, top with chia and almonds, drizzle with honey.',
  },
  {
    title: 'Rainbow quinoa nourish bowl',
    emoji: '🥗',
    mealType: 'Lunch',
    prepTime: '20 min',
    tags: ['Fibre rich', 'Vegan'],
    kcal: 480,
    protein: 16,
    ingredients: 'Quinoa, roasted vegetables, chickpeas, tahini dressing.',
    instructions: 'Cook quinoa, roast the vegetables, toss with chickpeas and tahini dressing.',
  },
  {
    title: 'Lentil & veggie comfort soup',
    emoji: '🍲',
    mealType: 'Dinner',
    prepTime: '30 min',
    tags: ['Gut friendly', 'Vegan'],
    kcal: 390,
    protein: 20,
    ingredients: 'Red lentils, carrots, celery, onion, vegetable stock, herbs.',
    instructions: 'Sauté the vegetables, add lentils and stock, simmer until tender, season with herbs.',
  },
  {
    title: 'Apple slices with nut butter',
    emoji: '🍏',
    mealType: 'Snack',
    prepTime: '5 min',
    tags: ['Quick', 'Vegetarian'],
    kcal: 210,
    protein: 6,
    ingredients: 'Apple, almond butter.',
    instructions: 'Slice the apple and serve with almond butter for dipping.',
  },
];

// UTC-based deliberately — see the matching fix + comment in
// client/src/lib/planBuilder.js and server/src/controllers/insights.controller.js. A local-time
// version here silently stored the seeded Plan's `week` shifted by a day in timezones ahead of
// UTC, which the plan builder (querying by exact `week` match) would then never find.
function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function seedDemoData(dietitian, client) {
  let recipes = await Recipe.find({ title: { $in: SEED_RECIPES.map((r) => r.title) } });
  if (recipes.length === 0) {
    recipes = await Recipe.insertMany(SEED_RECIPES.map((r) => ({ ...r, createdBy: dietitian._id })));
    console.log(`[seed] created ${recipes.length} demo recipes`);
  } else {
    console.log('[seed] demo recipes already exist, skipped');
  }

  const existingPlan = await Plan.findOne({ client: client._id });
  if (existingPlan) {
    console.log('[seed] demo plan/progress/calls/report already exist for the seed client, skipped');
    return;
  }

  const [breakfast, lunch, dinner, snack] = recipes;
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const meals = days.flatMap((day, i) => [
    { day, time: '8:00 AM', mealType: 'Breakfast', recipe: breakfast._id, completed: i < 2 },
    { day, time: '1:00 PM', mealType: 'Lunch', recipe: lunch._id, completed: i < 1 },
    { day, time: '7:30 PM', mealType: 'Dinner', recipe: i % 3 === 0 ? snack._id : dinner._id },
  ]);

  await Plan.create({
    client: client._id,
    dietitian: dietitian._id,
    title: "Cleo's weekly nourish plan",
    week: startOfWeek(new Date()),
    meals,
    published: true,
  });
  console.log('[seed] created demo weekly plan');

  const progressEntries = [
    { date: daysAgo(35), weight: 72, energy: 5, adherence: 70 },
    { date: daysAgo(28), weight: 71.1, energy: 6, adherence: 75 },
    { date: daysAgo(21), weight: 70.2, energy: 6, adherence: 80 },
    { date: daysAgo(14), weight: 69, energy: 7, adherence: 85 },
    { date: daysAgo(7), weight: 68.4, energy: 7, adherence: 88 },
    { date: daysAgo(1), weight: 67.8, energy: 8, adherence: 90 },
  ];
  await Progress.insertMany(progressEntries.map((entry) => ({ ...entry, client: client._id })));
  console.log(`[seed] created ${progressEntries.length} demo progress entries`);

  await Call.create([
    {
      client: client._id,
      dietitian: dietitian._id,
      scheduledAt: daysAgo(-2),
      status: 'scheduled',
      notes: 'Progress check-in',
    },
    {
      client: client._id,
      dietitian: dietitian._id,
      scheduledAt: daysAgo(10),
      status: 'completed',
      notes: 'Initial consult',
    },
  ]);
  console.log('[seed] created demo calls (1 upcoming, 1 past)');

  // filePath doesn't point to a real file in server/uploads/ — this is metadata-only seed data,
  // reports uploaded for real through the UI will have a working download link.
  await Report.create({
    client: client._id,
    fileName: 'lipid-panel.pdf',
    filePath: 'seed-lipid-panel.pdf',
    note: 'Latest lab results from my checkup.',
    status: 'reviewed',
    feedback: [
      {
        author: dietitian._id,
        authorName: dietitian.name,
        message: 'Thanks for sharing this — your numbers look steady, keep up the great work!',
      },
    ],
  });
  console.log('[seed] created demo report with dietitian feedback');
}

async function seed() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri);
  console.log(`[seed] connected → ${env.mongoUri}`);

  const created = [];
  const skipped = [];

  for (const { name, email, password, role } of SEED_USERS) {
    const existing = await User.findOne({ email });
    if (existing) {
      skipped.push(email);
      continue;
    }
    await User.create({ name, email, passwordHash: await hashPassword(password), role });
    created.push(email);
  }

  const dietitian = await User.findOne({ email: 'dietitian@nourishly.test' });
  const client = await User.findOne({ email: 'client@nourishly.test' });
  const client2 = await User.findOne({ email: 'client2@nourishly.test' });
  await User.updateOne({ _id: client._id, assignedDietitian: null }, { $set: { assignedDietitian: dietitian._id } });
  await User.updateOne({ _id: client2._id, assignedDietitian: null }, { $set: { assignedDietitian: dietitian._id } });

  console.log(`[seed] created: ${created.length ? created.join(', ') : '(none)'}`);
  console.log(`[seed] already existed, skipped: ${skipped.length ? skipped.join(', ') : '(none)'}`);
  console.log('[seed] credentials — see docs/worklog for the dated entry, or SEED_USERS above (password for all: Password123!)');

  await seedDemoData(dietitian, client);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
