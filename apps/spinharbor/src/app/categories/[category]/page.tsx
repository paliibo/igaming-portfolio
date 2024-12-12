import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CATEGORY_META, CATEGORY_SLUGS, categoryFromSlug } from '@/lib/game-meta';
import { CategoryView } from './category-view';

export function generateStaticParams() {
  return CATEGORY_SLUGS.map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const resolved = categoryFromSlug(category);
  return { title: resolved ? `${CATEGORY_META[resolved].label} games` : 'Category' };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const resolved = categoryFromSlug(category);
  if (!resolved) notFound();
  return <CategoryView category={resolved} />;
}
