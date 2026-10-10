import { connection } from 'next/server';

import { WeddingPage } from './_components/WeddingPage';

export default async function Home() {
  await connection();
  return <WeddingPage />;
}
