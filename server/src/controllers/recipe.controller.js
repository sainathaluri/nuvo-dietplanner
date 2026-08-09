import { Recipe } from '../models/Recipe.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

export const listRecipes = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.mealType) filter.mealType = req.query.mealType;
  if (req.query.search) filter.title = { $regex: req.query.search, $options: 'i' };
  res.json(await Recipe.find(filter).sort({ createdAt: -1 }));
});

export const getRecipe = asyncHandler(async (req, res) => {
  const recipe = await Recipe.findById(req.params.id);
  if (!recipe) throw ApiError.notFound('Recipe not found');
  res.json(recipe);
});

export const createRecipe = asyncHandler(async (req, res) => {
  res.status(201).json(await Recipe.create({ ...req.body, createdBy: req.user.id }));
});

export const updateRecipe = asyncHandler(async (req, res) => {
  const recipe = await Recipe.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!recipe) throw ApiError.notFound('Recipe not found');
  res.json(recipe);
});

export const deleteRecipe = asyncHandler(async (req, res) => {
  const recipe = await Recipe.findByIdAndDelete(req.params.id);
  if (!recipe) throw ApiError.notFound('Recipe not found');
  res.status(204).send();
});
