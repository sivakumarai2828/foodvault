import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({ baseURL: BASE })

// Categories
export const getCategories = () => api.get('/categories').then(r => r.data)
export const createCategory = (name) => api.post(`/categories?name=${encodeURIComponent(name)}`).then(r => r.data)
export const deleteCategory = (id) => api.delete(`/categories/${id}`)

// Recipes
export const getRecipes = (params = {}) => api.get('/recipes', { params }).then(r => r.data)
export const createRecipe = (data) => api.post('/recipes', data).then(r => r.data)
export const updateRecipe = (id, data) => api.patch(`/recipes/${id}`, data).then(r => r.data)
export const reExtractRecipe = (url) => api.get('/extract', { params: { url } }).then(r => r.data)
export const deleteRecipe = (id) => api.delete(`/recipes/${id}`)
export const previewLink  = (url) => api.get('/preview', { params: { url } }).then(r => r.data)
export const extractRecipe = (url) => api.get('/extract', { params: { url } }).then(r => r.data)
export const extractFromText = (text, title) => api.post('/extract-from-text', { text, title }).then(r => r.data)
export const imageProxyUrl = (url) => url ? `${BASE}/image-proxy?url=${encodeURIComponent(url)}` : null

// AI
export const aiCategorize = (recipeId) => api.post(`/ai/categorize?recipe_id=${recipeId}`).then(r => r.data)
export const aiIngredients = (recipeId) => api.post(`/ai/ingredients/${recipeId}`).then(r => r.data)
export const aiSuggestPlan = () => api.post('/ai/suggest-plan').then(r => r.data)
export const aiChat = (message) => api.post('/ai/chat', { message }).then(r => r.data)

// Meal Plan
export const getMealPlan = (weekStart) => api.get('/meal-plan', { params: weekStart ? { week_start: weekStart } : {} }).then(r => r.data)
export const setMealPlanEntry = (data) => api.post('/meal-plan', data).then(r => r.data)
export const deleteMealPlanEntry = (id) => api.delete(`/meal-plan/${id}`)

// Shopping
export const getShoppingList = (weekStart) => api.get('/shopping', { params: weekStart ? { week_start: weekStart } : {} }).then(r => r.data)
export const generateShoppingList = () => api.post('/shopping/generate').then(r => r.data)
export const toggleShoppingItem = (id) => api.patch(`/shopping/${id}/toggle`).then(r => r.data)
export const clearShoppingList = () => api.delete('/shopping')
export const addRecipeToShopping = (recipeId) => api.post(`/shopping/add-recipe/${recipeId}`).then(r => r.data)

// Today
export const getTodayMenu = () => api.get('/today').then(r => r.data)
