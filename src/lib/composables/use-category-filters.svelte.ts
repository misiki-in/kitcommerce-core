import { onMount } from "svelte"
import { categoryService } from "$lib/services/index.js"
import { page } from "$app/state"

export interface CategoryTree {
  id: string
  name: string
  parentCategoryId: string | null
  slug: string
  thumbnail: string
  children?: CategoryTree[]
}

class CategoryFilterState {
  static _instance: CategoryFilterState

  initialLoading: boolean = $state(true)

  allCategories: CategoryTree[] = $state([])
  topmostCategories: CategoryTree[] = $state([])

  currentCategorySlug = $derived(page.params.slug?.toLowerCase?.() || 'products')
  currentCategory: CategoryTree | null = $derived.by(() => this.allCategories.find(x => x.slug?.toLowerCase?.() === this.currentCategorySlug) ?? null)

  currentParentCategory = $derived.by(() => {
    if (!this.currentCategory)
      return null
    if (!this.currentCategory.parentCategoryId)
      return { name: "All categories", slug: 'products' }

    const parent = this.allCategories.find((x) => x.id === this.currentCategory?.parentCategoryId)
    if (!parent) {
      console.error("Parent id not found")
      return { name: "All categories", slug: 'products' }
    }
    return parent
  })

  constructor() {
    onMount(async () => {
      this.initialLoading = true
      try {
        const res: any = await categoryService.get('/api/categories/all')
        this.topmostCategories = this.constructCategoryTree(res.data)
        this.allCategories = res.data
      } catch (e) {
        console.error(e)
      } finally {
        this.initialLoading = false
      }
    })
  }

  constructCategoryTree = (allCategories: CategoryTree[]) => {
    const categoryToParentIdMap: Record<string, CategoryTree[]> = {}
    const roots = []
    for (const category of allCategories) {
      if (!category.parentCategoryId) {
        roots.push(category)
        continue
      }

      if (categoryToParentIdMap[category.parentCategoryId])
        categoryToParentIdMap[category.parentCategoryId].push(category)
      else
        categoryToParentIdMap[category.parentCategoryId] = [category]
    }

    for (const category of allCategories) {
      category.children = categoryToParentIdMap[category.id]
    }

    return roots
  }
}

export function setCategoryFilterState() {
  const state = new CategoryFilterState()
  CategoryFilterState._instance = state
}

export function getCategoryFilterState() {
  if (CategoryFilterState._instance)
    return CategoryFilterState._instance
  throw "No CategoryFilterState instance found"
}

