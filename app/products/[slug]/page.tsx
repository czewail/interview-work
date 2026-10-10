import { catalog } from '@/lib/catalog';
import DetailPage from '@/components/detail-page';
import { notFound } from 'next/navigation';
export const dynamicParams = false;
export function generateStaticParams() {
  return catalog.products.map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = catalog.products.find((p) => p.slug === slug);
  return { title: `${p?.name || 'Product not found'} — Form` };
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!catalog.products.some((p) => p.slug === slug)) notFound();
  return <DetailPage slug={slug} />;
}
