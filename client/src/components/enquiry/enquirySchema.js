import { z } from 'zod';
import { Leaf, Sun, Apple, Zap, Sparkles, MoreHorizontal } from 'lucide-react';

export const GOAL_OPTIONS = [
  { value: 'Weight loss', icon: Leaf },
  { value: 'PCOS support', icon: Sun },
  { value: 'Diabetes support', icon: Apple },
  { value: 'Sports nutrition', icon: Zap },
  { value: 'General wellness', icon: Sparkles },
  { value: 'Something else', icon: MoreHorizontal },
];

export const SLOT_OPTIONS = ['Weekday morning', 'Weekday afternoon', 'Weekday evening', 'Weekend'];

export const enquirySchema = z.object({
  goal: z.string().min(1, 'Choose a goal to continue'),
  name: z.string().min(1, 'Your name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(1, 'Your phone number is required'),
  preferredSlot: z.string().optional(),
  note: z.string().optional(),
});

export const STEP_FIELDS = {
  1: ['goal'],
  2: ['name', 'email', 'phone'],
  3: ['preferredSlot', 'note'],
};
