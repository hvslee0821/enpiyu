import { notFound } from 'next/navigation';
import SecretCodePage from '../secret/page';

export default async function DynamicAdminPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  const adminPath = process.env.CODE_ADMIN_PATH?.trim();
  if (adminPath && path === adminPath) {
    return <SecretCodePage />;
  }
  notFound();
}
