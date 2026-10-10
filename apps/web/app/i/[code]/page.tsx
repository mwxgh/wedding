import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import type { PublicInvitation } from '@repo/contracts';

import { WeddingPage } from '../../_components/WeddingPage';
import { serverGet } from '../../_lib/api';

export const metadata: Metadata = {
  title: 'Thiệp mời cưới',
  robots: { index: false },
};

export default async function InvitationPage({
  params,
}: PageProps<'/i/[code]'>) {
  const { code } = await params;
  const invitation = await serverGet<PublicInvitation>(
    `/public/invitations/${encodeURIComponent(code)}`,
  );
  if (!invitation) notFound();
  return <WeddingPage invitation={invitation} />;
}
