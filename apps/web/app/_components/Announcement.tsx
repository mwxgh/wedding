import { dateParts, formatTime } from '../_lib/format';
import { FlowerSprig, SongHy } from './ornaments';

/**
 * The formal "báo hỷ" card on deep burgundy: both families, the announcement
 * line, the couple, where and when the ceremony is held (solar + lunar date)
 * and, on personal pages, the guest's invitation.
 */
export function Announcement({
  groomName,
  brideName,
  groomParents,
  brideParents,
  ceremonyAt,
  venueName,
  lunarDate,
  guestName,
}: {
  groomName: string;
  brideName: string;
  groomParents?: string | null;
  brideParents?: string | null;
  /** ISO start of the wedding-day ceremony. */
  ceremonyAt: string;
  /** Where the ceremony is held, e.g. "Tư gia nhà trai". */
  venueName?: string;
  lunarDate: string;
  guestName?: string;
}) {
  const { weekday, day, month, year } = dateParts(ceremonyAt);
  const hasFamilies = !!(groomParents || brideParents);

  return (
    <article
      className={`relative mx-auto max-w-2xl rounded-xl bg-primary px-6 pt-10
        pb-12 text-center text-primary-foreground
        shadow-[0_30px_60px_-30px_rgb(60_10_20/0.8)] sm:px-12 sm:pt-14 sm:pb-16`}
    >
      {/* fine gold inner frame + sprig breaking the edge */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-2.5 rounded-lg border
          border-gold-light/30`}
      />
      <FlowerSprig
        className={`pointer-events-none absolute -right-6 -bottom-10 h-44 w-32
          -scale-x-100 text-gold-light/70 sm:-right-10 sm:h-60 sm:w-44`}
      />

      <div className="relative">
        <h2
          className={`font-serif text-lg font-semibold tracking-[0.2em]
            uppercase`}
        >
          Thông tin lễ cưới
        </h2>

        {hasFamilies && (
          <div
            className={`mt-6 grid grid-cols-[1fr_auto_1fr] gap-4 text-sm sm:mt-8
            sm:gap-8`}
          >
            <Family label="Nhà trai" parents={groomParents} />
            <span aria-hidden className="w-px bg-gold-light/40" />
            <Family label="Nhà gái" parents={brideParents} />
          </div>
        )}

        <p
          className={`mx-auto mt-8 max-w-xs font-serif text-[15px] leading-snug
            tracking-wide uppercase`}
        >
          Trân trọng báo tin
          <br />
          lễ thành hôn của con chúng tôi
        </p>

        <Person role="Chú rể" name={groomName} />
        <span
          aria-hidden
          className="mt-3 block font-serif text-3xl text-gold-light italic"
        >
          &amp;
        </span>
        <Person role="Cô dâu" name={brideName} />

        {venueName && (
          <p
            className={`mx-auto mt-8 max-w-xs font-serif text-[15px]
            tracking-wide uppercase`}
          >
            Lễ thành hôn được cử hành tại
            <span className="mt-1 block text-lg normal-case">{venueName}</span>
          </p>
        )}

        {/* time | weekday, then day | month · year */}
        <div className="mt-6 flex flex-col items-center gap-3 font-serif">
          <p
            className={`flex items-center gap-4 text-xs tracking-[0.25em]
              uppercase`}
          >
            <span>Vào lúc {formatTime(ceremonyAt)}</span>
            <span aria-hidden className="h-3 w-px bg-gold-light/50" />
            <span>{weekday}</span>
          </p>
          <p className="flex items-center gap-4">
            <span
              className={`text-5xl leading-none font-light tabular-nums
                sm:text-6xl`}
            >
              {day}
            </span>
            <span aria-hidden className="h-10 w-px bg-gold-light/50" />
            <span
              className={`text-left text-sm leading-tight tracking-[0.15em]
                uppercase`}
            >
              Tháng {month}
              <span className="block tabular-nums">{year}</span>
            </span>
          </p>
          <p className="text-sm tracking-wide text-primary-foreground/80 italic">
            (Tức {lunarDate})
          </p>
        </div>

        {guestName && (
          <div
            className={`mx-auto mt-10 max-w-xs rounded-lg border
            border-gold-light/35 px-5 py-6`}
          >
            <p
              className={`text-[11px] tracking-[0.3em] text-gold-light
              uppercase`}
            >
              Trân trọng kính mời
            </p>
            <p
              className={`mt-2 font-serif text-3xl leading-tight font-light
              sm:text-4xl`}
            >
              {guestName}
            </p>
            <p
              className={`mt-2 font-serif text-[15px] text-primary-foreground/85
              italic`}
            >
              tới dự bữa tiệc chung vui cùng gia đình chúng tôi
            </p>
          </div>
        )}

        <SongHy className="mt-10 inline-block text-2xl text-gold-light/80" />
      </div>
    </article>
  );
}

function Family({
  label,
  parents,
}: {
  label: string;
  parents?: string | null;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[11px] tracking-[0.25em] text-gold-light uppercase">
        {label}
      </span>
      {/* "Ông X & Bà Y" reads as two lines, as on printed invitations */}
      <p className="font-serif text-[15px] leading-snug font-medium sm:text-lg">
        {(parents ?? '—').split(/\s*&\s*/).map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </p>
    </div>
  );
}

function Person({ role, name }: { role: string; name: string }) {
  return (
    <div className="mt-6 flex flex-col items-center">
      <span className="font-serif text-4xl leading-tight font-light sm:text-5xl">
        {name}
      </span>
      <span
        className={
          'mt-1 text-[11px] tracking-[0.3em] text-gold-light uppercase'
        }
      >
        {role}
      </span>
    </div>
  );
}
