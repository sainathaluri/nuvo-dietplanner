import {
  listRecipes as queryRecipes,
  findRecipeById,
  createRecipe as createRecipeRecord,
  updateRecipeById,
  deleteRecipeById,
} from '../models/Recipe.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { toClientShape } from '../utils/serialize.js';

export const listRecipes = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.mealType) filter.mealType = req.query.mealType;
  if (req.query.search) filter.search = req.query.search;
  const recipes = await queryRecipes(filter);
  res.json(recipes.map((r) => toClientShape(r)));
});

export const getRecipe = asyncHandler(async (req, res) => {
  const recipe = await findRecipeById(req.params.id);
  if (!recipe) throw ApiError.notFound('Recipe not found');
  res.json(toClientShape(recipe));
});

export const createRecipe = asyncHandler(async (req, res) => {
  const recipe = await createRecipeRecord({ ...req.body, createdBy: req.user.id });
  res.status(201).json(toClientShape(recipe));
});

export const updateRecipe = asyncHandler(async (req, res) => {
  const recipe = await updateRecipeById(req.params.id, req.body);
  if (!recipe) throw ApiError.notFound('Recipe not found');
  res.json(toClientShape(recipe));
});

export const deleteRecipe = asyncHandler(async (req, res) => {
  const recipe = await deleteRecipeById(req.params.id);
  if (!recipe) throw ApiError.notFound('Recipe not found');
  res.status(204).send();
});
