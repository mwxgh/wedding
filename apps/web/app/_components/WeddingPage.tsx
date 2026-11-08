import type {
  PublicGallery,
  PublicGuestbookEntry,
  PublicInvitation,
  PublicWedding,
} from '@repo/types';
import { LoveCursor } from '@repo/ui/components/love-cursor';
import { SoundToggle } from '@repo/ui/components/sound-toggle';
import { formatLunarDate, weddingStart } from '@repo/utils';

import { serverGet } from '../_lib/api';
import { Announcement } from './Announcement';
import { Countdown } from './Countdown';
import { EventCard } from './EventCard';
import { Gallery } from './Gallery';
import { GiftBox } from './GiftBox';
import { Guestbook } from './Guestbook';
import { Hero } from './Hero';
import { LoveStory } from './LoveStory';
import { PhotoUpload } from './PhotoUpload';
import { Reveal } from './Reveal';
import { RsvpForm } from './RsvpForm';
import { WishWall } from './WishWall';
import { Container, Section, SectionTitle } from './common';
import { CloudMotif, PatternBackdrop, SongHy } from './ornaments';

export async function WeddingPage({
  invitation,
}: {
  invitation?: PublicInvitation;
}) {
  const [wedding, guestbook, gallery] = await Promise.all([
    serverGet<PublicWedding>('/public/wedding'),
    serverGet<PublicGuestbookEntry[]>('/public/guestbook'),
    serverGet<PublicGallery>('/public/photos'),
  ]);

  const info = wedding?.info;
  if (!info) {
    return (
      <Container
        data-theme="invite"
        className={`flex min-h-dvh flex-col items-center justify-center py-20
          text-center`}
      >
        <SongHy className="mb-5 text-5xl text-primary" />
        <h1 className="font-serif text-3xl font-medium tracking-tight">
          Website đang được chuẩn bị
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          Chưa có thông tin đám cưới, hoặc API chưa chạy. Hãy chạy{' '}
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm">
            pnpm db:seed
          </code>{' '}
          hoặc cập nhật trong trang quản trị.
        </p>
      </Container>
    );
  }

  const events = invitation?.events ?? wedding.events;
  const photos = gallery?.photos ?? [];
  // the first event of the wedding day is "the" ceremony on the card
  const start = weddingStart(info.weddingDate, wedding.events);
  const ceremony = wedding.events.find(
    (e) => new Date(e.startAt).getTime() === start.getTime(),
  );
  const lunarDate = formatLunarDate(start);

  return (
    <div data-theme="invite" className="min-h-dvh bg-background">
      <main className="relative w-full overflow-x-clip">
        <LoveCursor
          colors={[
            'var(--primary)',
            'color-mix(in oklch, var(--primary), white 25%)',
            'var(--gold)',
            'var(--gold-light)',
          ]}
        />
        <SoundToggle src="/music/canon-in-d.mp3" />
        <Hero
          groomName={info.groomName}
          brideName={info.brideName}
          weddingDate={start.toISOString()}
          lunarDate={lunarDate}
          photo={photos[0]?.url}
          recipient={invitation?.name}
        >
          <Countdown target={start.toISOString()} />
        </Hero>

        <Section id="thiep-moi" alt>
          <Reveal>
            <Announcement
              groomName={info.groomName}
              brideName={info.brideName}
              groomParents={info.groomParents}
              brideParents={info.brideParents}
              ceremonyAt={start.toISOString()}
              venueName={ceremony?.venueName}
              lunarDate={lunarDate}
              guestName={invitation?.name}
            />
          </Reveal>
        </Section>

        {events.length > 0 && (
          <Section>
            <Reveal>
              <SectionTitle script="Hôn lễ" title="Thời gian & địa điểm" />
              <ol className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
                {events.map((e) => (
                  <li key={e.id}>
                    <EventCard event={e} />
                  </li>
                ))}
              </ol>
            </Reveal>
          </Section>
        )}

        {invitation && invitation.events.length > 0 && (
          <Section id="rsvp" alt>
            <Reveal>
              <SectionTitle script="Xác nhận tham dự" title="Bạn sẽ đến chứ?" />
              <RsvpForm invitation={invitation} />
            </Reveal>
          </Section>
        )}

        {photos.length > 0 && (
          <Section>
            <SectionTitle script="Album" title="Khoảnh khắc của chúng mình" />
            <Gallery photos={photos} />
          </Section>
        )}

        {invitation && (
          <Section alt>
            <Reveal>
              <SectionTitle script="Chia sẻ" title="Gửi ảnh của bạn" />
              <PhotoUpload invitationCode={invitation.code} />
            </Reveal>
          </Section>
        )}

        <Section>
          <Reveal>
            <SectionTitle script="Sổ lưu bút" title="Gửi lời chúc" />
            <Guestbook
              invitationCode={invitation?.code}
              defaultName={invitation?.name}
            />
          </Reveal>
        </Section>

        <Section id="loi-chuc" alt>
          <SectionTitle script="Yêu thương" title="Lời chúc từ mọi người" />
          <WishWall initial={guestbook ?? []} />
        </Section>

        {wedding.giftChannels.length > 0 && (
          <Section alt>
            <Reveal>
              <SectionTitle script="Mừng cưới" title="Hộp mừng cưới" />
              <GiftBox
                channels={wedding.giftChannels}
                defaultSide={invitation?.side}
                defaultName={invitation?.name}
                invitationCode={invitation?.code}
              />
            </Reveal>
          </Section>
        )}

        <Section>
          <SectionTitle
            script="Chuyện tình yêu"
            title="Hành trình của chúng mình"
          />
          {info.story && (
            <blockquote
              className={`mx-auto max-w-2xl text-center font-serif text-xl
              leading-relaxed whitespace-pre-line text-foreground/85 italic`}
            >
              {info.story}
            </blockquote>
          )}
          <LoveStory groomName={info.groomName} brideName={info.brideName} />
        </Section>

        <footer
          className={`relative isolate overflow-hidden bg-primary px-4 pt-20
            pb-24 text-center text-primary-foreground`}
        >
          <PatternBackdrop className="opacity-[0.12]" />
          <SongHy className="text-6xl text-gold-light" />
          <p className="mt-6 font-serif text-2xl">Hân hạnh được đón tiếp</p>
          <CloudMotif className="mx-auto mt-6 text-gold-light/70" />
          <p
            className={`mt-6 font-serif text-4xl font-light text-gold-light
              italic`}
          >
            {info.groomName} &amp; {info.brideName}
          </p>
          <p
            className={`mt-3 text-xs font-medium tracking-[0.3em]
              text-primary-foreground/80 uppercase`}
          >
            {lunarDate}
          </p>
        </footer>
      </main>
    </div>
  );
}
