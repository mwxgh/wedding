/**
 * Demo data for the admin dashboard: ~48 invitations with opens, RSVPs,
 * seating, gifts and guestbook wishes spread over the last 25 days.
 *
 *   pnpm db:seed:demo           add demo data (replaces previous demo data)
 *   pnpm db:seed:demo --clean   remove demo data only
 *
 * Everything it creates is tagged "[demo]", so real data is never touched.
 */
import 'dotenv/config';

import {
  GiftMethod,
  ModerationStatus,
  Relation,
  RsvpStatus,
  Side,
  createPrismaClient,
} from '../src/index.js';

const TAG = '[demo]';
const prisma = createPrismaClient(process.env.DATABASE_URL!);

// deterministic random so the dashboard looks the same on every run
let seed = 42;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const pick = <T>(items: readonly T[]) =>
  items[Math.floor(rand() * items.length)]!;
const DAY = 24 * 60 * 60 * 1000;

const NAMES = [
  'Gia đình chú Hùng',
  'Anh Tuấn & chị Mai',
  'Bạn Linh',
  'Gia đình bác Toàn',
  'Chị Hằng',
  'Anh Quân',
  'Nhóm lớp đại học',
  'Gia đình cô Lan',
  'Bạn Phương',
  'Anh Đức',
  'Chị Ngọc',
  'Gia đình ông Bảy',
  'Team dự án A',
  'Bạn Trang',
  'Anh Khoa & chị Vy',
  'Gia đình dì Thảo',
  'Bạn Minh',
  'Chị Hà',
  'Anh Long',
  'Gia đình bác Sơn',
  'Bạn Dung',
  'Anh Hiếu',
  'Chị Thu',
  'Hàng xóm bác Tư',
];

async function clean() {
  const demo = await prisma.invitation.findMany({
    where: { note: TAG },
    select: { id: true },
  });
  const ids = demo.map((i) => i.id);
  await prisma.gift.deleteMany({ where: { description: TAG } });
  await prisma.guestbookEntry.deleteMany({
    where: { invitationId: { in: ids } },
  });
  await prisma.invitation.deleteMany({ where: { id: { in: ids } } });
  return ids.length;
}

async function main() {
  const removed = await clean();
  if (process.argv.includes('--clean')) {
    console.log(`Removed ${removed} demo invitations.`);
    return;
  }

  const events = await prisma.event.findMany({
    orderBy: { startAt: 'asc' },
    include: { tables: true },
  });
  if (!events.length) throw new Error('Run `pnpm db:seed` first.');

  const now = Date.now();
  const relations = Object.values(Relation);
  const methods = [
    GiftMethod.BANK_TRANSFER,
    GiftMethod.BANK_TRANSFER,
    GiftMethod.CASH,
    GiftMethod.GOLD,
  ];

  for (let n = 0; n < 48; n++) {
    const side = pick([
      Side.GROOM,
      Side.GROOM,
      Side.BRIDE,
      Side.BRIDE,
      Side.BOTH,
    ]);
    const maxGuests = 1 + Math.floor(rand() * 4);
    const sentAt = now - (8 + rand() * 17) * DAY;
    const openedAt = rand() < 0.82 ? new Date(sentAt + rand() * 6 * DAY) : null;
    const answers = openedAt && rand() < 0.8;
    const repliedAt =
      openedAt && new Date(openedAt.getTime() + rand() * 3 * DAY);
    // most guests are invited to the main reception, some to every event
    const invited = events.filter(
      (e, i) => i === events.length - 1 || rand() < 0.45,
    );

    const invitation = await prisma.invitation.create({
      data: {
        code: `demo${n.toString().padStart(6, '0')}`,
        name: `${pick(NAMES)} ${n + 1}`,
        side,
        relation: pick(relations),
        maxGuests,
        note: TAG,
        createdAt: new Date(sentAt),
        openedAt,
        events: {
          create: invited.map((e) => {
            if (!answers) return { eventId: e.id };
            const roll = rand();
            const status =
              roll < 0.68
                ? RsvpStatus.ATTENDING
                : roll < 0.82
                  ? RsvpStatus.MAYBE
                  : RsvpStatus.DECLINED;
            const attending = status === RsvpStatus.ATTENDING;
            return {
              eventId: e.id,
              status,
              attendingCount: attending
                ? 1 + Math.floor(rand() * maxGuests)
                : 0,
              respondedAt: repliedAt,
              tableId:
                attending && e.tables.length && rand() < 0.6
                  ? pick(e.tables).id
                  : null,
            };
          }),
        },
      },
    });

    if (answers && rand() < 0.5) {
      await prisma.gift.create({
        data: {
          giverName: invitation.name,
          invitationId: invitation.id,
          eventId: invited.at(-1)!.id,
          method: pick(methods),
          amount: BigInt(pick([500, 500, 1000, 1000, 2000, 3000, 5000]) * 1000),
          description: TAG,
          receivedAt: repliedAt ?? new Date(),
        },
      });
    }
    if (answers && rand() < 0.35) {
      await prisma.guestbookEntry.create({
        data: {
          invitationId: invitation.id,
          authorName: invitation.name,
          message: 'Chúc hai bạn trăm năm hạnh phúc!',
          status:
            rand() < 0.6 ? ModerationStatus.APPROVED : ModerationStatus.PENDING,
          createdAt: repliedAt ?? new Date(),
        },
      });
    }
  }
  console.log(
    'Added 48 demo invitations (remove with `pnpm db:seed:demo --clean`).',
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
