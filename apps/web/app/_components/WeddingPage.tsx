import type {
  PublicGallery,
  PublicGuestbookEntry,
  PublicInvitation,
  PublicWedding,
} from '@repo/contracts';
import { Card, CardContent } from '@repo/ui/components/card';
import { LoveCursor } from '@repo/ui/components/love-cursor';
import { LoveJourney } from '@repo/ui/components/love-journey';
import { SoundToggle } from '@repo/ui/components/sound-toggle';

import { serverGet } from '../_lib/api';
import { SIDE_LABEL, formatDate, vietQrUrl } from '../_lib/format';
import { Countdown } from './Countdown';
import { EventCard } from './EventCard';
import { Gallery } from './Gallery';
import { Guestbook } from './Guestbook';
import { Hero } from './Hero';
import { PhotoUpload } from './PhotoUpload';
import { Reveal } from './Reveal';
import { RsvpForm } from './RsvpForm';
import { Container, Section, SectionTitle } from './common';

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
      <Container className="py-18 text-center">
        <h1 className="font-serif text-3xl">Website đang được chuẩn bị</h1>
        <p className="mt-3 text-muted-foreground">
          Chưa có thông tin đám cưới, hoặc API chưa chạy. Hãy chạy{' '}
          <code>pnpm db:seed</code> hoặc cập nhật trong trang quản trị.
        </p>
      </Container>
    );
  }

  const events = invitation?.events ?? wedding.events;
  const photos = gallery?.photos ?? [];

  return (
    <main>
      <LoveCursor />
      <SoundToggle src="/music/wedding.mp3" />
      <Hero
        groomName={info.groomName}
        brideName={info.brideName}
        date={formatDate(info.weddingDate)}
        recipient={invitation?.name}
      >
        <Countdown target={info.weddingDate} />
        {invitation && (
          <div
            className={`mt-7 inline-block rounded-2xl border bg-card/70 px-6
            py-4 backdrop-blur`}
          >
            <p className="text-muted-foreground">Trân trọng kính mời</p>
            <strong className="font-serif text-2xl font-medium text-rose-deep">
              {invitation.name}
            </strong>
          </div>
        )}
      </Hero>

      <Section>
        <Reveal>
          <SectionTitle
            script="Cô dâu & Chú rể"
            title="Chúng mình về chung một nhà"
          />
          <div
            className={`grid items-center gap-6 text-center
              sm:grid-cols-[1fr_auto_1fr]`}
          >
            <div>
              <h3 className="font-serif text-3xl text-rose-deep">
                {info.groomName}
              </h3>
              {info.groomParents && (
                <p className="text-muted-foreground">
                  Con ông bà: {info.groomParents}
                </p>
              )}
            </div>
            <div className="text-3xl text-primary">♥</div>
            <div>
              <h3 className="font-serif text-3xl text-rose-deep">
                {info.brideName}
              </h3>
              {info.brideParents && (
                <p className="text-muted-foreground">
                  Con ông bà: {info.brideParents}
                </p>
              )}
            </div>
          </div>
          {info.story && (
            <p
              className={`mx-auto mt-10 max-w-2xl text-center text-lg
              whitespace-pre-line`}
            >
              {info.story}
            </p>
          )}
        </Reveal>
      </Section>

      {events.length > 0 && (
        <Section alt>
          <Reveal>
            <SectionTitle script="Sự kiện" title="Thời gian & địa điểm" />
            <div className="grid gap-5 sm:grid-cols-2">
              {events.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          </Reveal>
        </Section>
      )}

      {invitation && invitation.events.length > 0 && (
        <Section id="rsvp">
          <Reveal>
            <SectionTitle script="Xác nhận tham dự" title="Bạn sẽ đến chứ?" />
            <RsvpForm invitation={invitation} />
          </Reveal>
        </Section>
      )}

      {photos.length > 0 && (
        <Section alt={!!invitation}>
          <SectionTitle script="Album" title="Khoảnh khắc của chúng mình" />
          <Gallery photos={photos} />
        </Section>
      )}

      {invitation && (
        <Section>
          <Reveal>
            <SectionTitle script="Chia sẻ" title="Gửi ảnh của bạn" />
            <PhotoUpload invitationCode={invitation.code} />
          </Reveal>
        </Section>
      )}

      <Section alt>
        <Reveal>
          <SectionTitle script="Sổ lưu bút" title="Gửi lời chúc" />
          <Guestbook
            entries={guestbook ?? []}
            invitationCode={invitation?.code}
            defaultName={invitation?.name}
          />
        </Reveal>
      </Section>

      {wedding.bankAccounts.length > 0 && (
        <Section>
          <Reveal>
            <SectionTitle script="Mừng cưới" title="Hộp mừng cưới" />
            <div className="grid gap-5 sm:grid-cols-2">
              {wedding.bankAccounts.map((b) => (
                <Card key={b.id} className="text-center">
                  <CardContent>
                    <strong>{SIDE_LABEL[b.side]}</strong>
                    {/* eslint-disable-next-line @next/next/no-img-element -- external VietQR image */}
                    <img
                      src={vietQrUrl(b.bankBin, b.accountNumber, b.accountName)}
                      alt={`QR ${b.accountName}`}
                      loading="lazy"
                      className="mx-auto my-3 w-56 rounded-xl"
                    />
                    <p>{b.accountName}</p>
                    <p className="text-muted-foreground">{b.accountNumber}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </Reveal>
        </Section>
      )}

      <footer className="px-4 py-12 text-center text-muted-foreground">
        <p className="font-script text-4xl text-rose-deep">Thank you!</p>
        <p>
          {info.groomName} &amp; {info.brideName}
        </p>
      </footer>

      {/* last: it adds the scroll space its finale plays in */}
      <LoveJourney groomName={info.groomName} brideName={info.brideName} />
    </main>
  );
}
