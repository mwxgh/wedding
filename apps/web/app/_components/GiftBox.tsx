'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  CheckIcon,
  ClockIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  GiftIcon,
  HeartIcon,
  Loader2Icon,
  QrCodeIcon,
  RotateCcwIcon,
  WalletIcon,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';

import type {
  GiftPaymentInput,
  PublicGiftPayment,
  PublicGiftStatus,
  Side,
} from '@repo/types';
import { Button, buttonVariants } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Textarea } from '@repo/ui/components/textarea';
import { cn } from '@repo/ui/lib/utils';

import { clientFetch } from '../_lib/api';
import { formatVnd } from '../_lib/format';
import { FormAlert, FormField } from './common';

const PRESETS = [200_000, 500_000, 1_000_000, 2_000_000, 5_000_000];
const POLL_MS = 3_000;
const MIN_AMOUNT = 10_000;

const FAMILY: Record<'GROOM' | 'BRIDE', string> = {
  GROOM: 'Nhà trai',
  BRIDE: 'Nhà gái',
};

const shortVnd = (n: number) =>
  n >= 1_000_000
    ? `${new Intl.NumberFormat('vi-VN').format(n / 1_000_000)} triệu`
    : `${n / 1_000}k`;

// QR modules: the invite theme's --foreground (an SVG fill attribute and the
// saved PNG cannot resolve CSS variables)
const QR_INK = '#3a1218';

// heart in the middle of the QR, cut out so the code stays scannable
const HEART =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#fff"/><path fill="#6b1622" d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>`,
  );

type Step =
  | { kind: 'form' }
  | { kind: 'qr'; payment: PublicGiftPayment }
  | { kind: 'paid'; payment: PublicGiftPayment }
  | {
      kind: 'ended';
      payment: PublicGiftPayment;
      reason: 'expired' | 'cancelled';
    };

const STEPS = [
  { label: 'Số tiền', icon: WalletIcon },
  { label: 'Quét mã', icon: QrCodeIcon },
  { label: 'Hoàn tất', icon: HeartIcon },
] as const;

/** Presentational progress: amount → QR → done. */
function StepIndicator({ kind }: { kind: Step['kind'] }) {
  const current = kind === 'form' ? 0 : kind === 'qr' ? 1 : 2;
  return (
    <ol
      className="mb-6 flex items-center gap-2"
      aria-label="Các bước mừng cưới"
    >
      {STEPS.map(({ label, icon: Icon }, i) => {
        const state =
          i < current ? 'done' : i === current ? 'current' : 'upcoming';
        return (
          <li
            key={label}
            aria-current={state === 'current' ? 'step' : undefined}
            className="flex flex-1 items-center gap-2 last:flex-none"
          >
            <span
              className={cn(
                `flex size-8 shrink-0 items-center justify-center rounded-full
                text-xs font-semibold transition-colors duration-300`,
                state === 'current' &&
                  'bg-primary text-primary-foreground shadow-sm',
                state === 'done' && 'bg-primary/15 text-rose-deep',
                state === 'upcoming' &&
                  'bg-muted text-muted-foreground ring-1 ring-border',
              )}
            >
              {state === 'done' ? (
                <CheckIcon aria-hidden className="size-4" />
              ) : (
                <Icon aria-hidden className="size-4" />
              )}
            </span>
            <span
              className={cn(
                'text-xs font-medium whitespace-nowrap',
                state === 'upcoming'
                  ? 'text-muted-foreground'
                  : 'text-foreground',
                state !== 'current' && 'max-sm:sr-only',
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  'h-px flex-1 transition-colors duration-300',
                  i < current ? 'bg-primary/40' : 'bg-border',
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Online wedding gift: pick a family and an amount, scan a payOS QR, and the
 * box notices on its own when the transfer lands.
 */
export function GiftBox({
  channels,
  defaultSide,
  defaultName = '',
  invitationCode,
}: {
  channels: Side[];
  defaultSide?: Side;
  defaultName?: string;
  invitationCode?: string;
}) {
  const sides = channels.filter(
    (s): s is 'GROOM' | 'BRIDE' => s === 'GROOM' || s === 'BRIDE',
  );
  const [side, setSide] = useState<'GROOM' | 'BRIDE'>(
    sides.find((s) => s === defaultSide) ?? sides[0] ?? 'GROOM',
  );
  const [preset, setPreset] = useState<number | null>(PRESETS[1]!);
  const [custom, setCustom] = useState('');
  const [giverName, setGiverName] = useState(defaultName);
  const [message, setMessage] = useState('');
  const [step, setStep] = useState<Step>({ kind: 'form' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const amount = preset ?? Number(custom || 0);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (amount < MIN_AMOUNT) {
      setError(`Số tiền tối thiểu là ${formatVnd(MIN_AMOUNT)}`);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const body: GiftPaymentInput = {
        side,
        amount,
        giverName,
        message: message || undefined,
        invitationCode,
      };
      const payment = await clientFetch<PublicGiftPayment>('/public/gifts', {
        body,
      });
      setStep({ kind: 'qr', payment });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const reset = useCallback(() => setStep({ kind: 'form' }), []);

  return (
    <div
      className={`relative mx-auto max-w-3xl overflow-hidden rounded-3xl bg-card
        shadow-lift ring-1 ring-foreground/[0.06]`}
    >
      {/* soft wash behind the content */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -top-32 -right-24 size-80
          rounded-full bg-primary/10 blur-3xl`}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute -bottom-28 -left-20 size-72
          rounded-full bg-gold/15 blur-3xl`}
      />

      <div className="relative grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Envelope paid={step.kind === 'paid'} />

        <div className="p-5 sm:p-8">
          {/* mobile stand-in for the envelope panel */}
          <div className="mb-5 flex items-center gap-3 md:hidden">
            <span
              aria-hidden
              className={`flex size-10 items-center justify-center rounded-2xl
                bg-primary/10 text-rose-deep`}
            >
              <GiftIcon className="size-5" />
            </span>
            <p className="font-serif text-2xl text-rose-deep italic">
              Gửi yêu thương
            </p>
          </div>
          <StepIndicator kind={step.kind} />
          <AnimatePresence mode="wait" initial={false}>
            {step.kind === 'form' && (
              <Pane key="form">
                <form onSubmit={create} className="flex flex-col gap-5">
                  {error && <FormAlert tone="error">{error}</FormAlert>}

                  {sides.length > 1 && (
                    <div
                      role="radiogroup"
                      aria-label="Gửi mừng cho"
                      className={`grid grid-cols-2 gap-1 rounded-full bg-muted
                      p-1 ring-1 ring-border/60`}
                    >
                      {sides.map((s) => (
                        <button
                          key={s}
                          type="button"
                          role="radio"
                          aria-checked={side === s}
                          onClick={() => setSide(s)}
                          className={cn(
                            `relative min-h-11 rounded-full px-4 py-2 text-sm
                            font-medium transition-colors outline-none
                            focus-visible:ring-3 focus-visible:ring-ring/50
                            sm:min-h-10`,
                            side === s
                              ? 'text-foreground'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {side === s && (
                            <motion.span
                              layoutId="gift-side"
                              className={`absolute inset-0 rounded-full bg-card
                              shadow-sm`}
                              transition={{ type: 'spring', bounce: 0.2 }}
                            />
                          )}
                          <span className="relative">
                            Mừng {FAMILY[s].toLowerCase()}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {sides.length === 1 && (
                    <p
                      className={`w-fit rounded-full bg-secondary px-3 py-1
                      text-sm font-medium text-secondary-foreground`}
                    >
                      Gửi mừng tới {FAMILY[side].toLowerCase()}
                    </p>
                  )}

                  <fieldset className="grid gap-2.5">
                    <legend className="mb-2.5 text-sm font-medium">
                      Số tiền mừng
                    </legend>
                    <div className="grid grid-cols-3 gap-2">
                      {PRESETS.map((v) => (
                        <button
                          key={v}
                          type="button"
                          aria-pressed={preset === v}
                          onClick={() => {
                            setPreset(v);
                            setCustom('');
                          }}
                          className={cn(
                            `min-h-11 rounded-xl border px-2 py-2.5 text-sm
                            font-medium tabular-nums transition-all outline-none
                            focus-visible:ring-3 focus-visible:ring-ring/50`,
                            preset === v
                              ? `border-primary bg-primary/10 text-rose-deep
                                shadow-sm ring-3 ring-primary/15`
                              : `bg-card hover:border-primary/50
                                hover:bg-muted/60`,
                          )}
                        >
                          {shortVnd(v)}
                        </button>
                      ))}
                      <button
                        type="button"
                        aria-pressed={preset === null}
                        onClick={() => setPreset(null)}
                        className={cn(
                          `min-h-11 rounded-xl border px-2 py-2.5 text-sm
                          font-medium transition-all outline-none
                          focus-visible:ring-3 focus-visible:ring-ring/50`,
                          preset === null
                            ? `border-primary bg-primary/10 text-rose-deep
                              shadow-sm ring-3 ring-primary/15`
                            : `bg-card hover:border-primary/50
                              hover:bg-muted/60`,
                        )}
                      >
                        Số khác
                      </button>
                    </div>
                    <AnimatePresence initial={false}>
                      {preset === null && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <label
                            htmlFor="gift-custom"
                            className={`mt-1 mb-1.5 block text-sm
                            text-muted-foreground`}
                          >
                            Số tiền khác (đồng)
                          </label>
                          <div className="relative">
                            <Input
                              id="gift-custom"
                              inputMode="numeric"
                              autoFocus
                              placeholder="Nhập số tiền"
                              className="h-11 pr-10 text-base tabular-nums"
                              value={
                                custom
                                  ? new Intl.NumberFormat('vi-VN').format(
                                      Number(custom),
                                    )
                                  : ''
                              }
                              onChange={(e) =>
                                setCustom(
                                  e.target.value.replace(/\D/g, '').slice(0, 9),
                                )
                              }
                            />
                            <span
                              aria-hidden
                              className={`absolute top-1/2 right-3.5 mt-0.5
                              -translate-y-1/2 text-muted-foreground`}
                            >
                              ₫
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </fieldset>

                  <FormField label="Tên người mừng" htmlFor="gift-name">
                    <Input
                      id="gift-name"
                      value={giverName}
                      onChange={(e) => setGiverName(e.target.value)}
                      required
                      maxLength={100}
                      autoComplete="name"
                      placeholder="Để cô dâu chú rể biết ai đã gửi"
                    />
                  </FormField>
                  <FormField label="Lời chúc kèm theo" htmlFor="gift-message">
                    <Textarea
                      id="gift-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={500}
                      placeholder="Không bắt buộc"
                      className="min-h-20"
                    />
                  </FormField>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={loading}
                    className="h-12 rounded-xl text-base sm:h-11"
                  >
                    {loading ? (
                      <Loader2Icon
                        data-icon="inline-start"
                        aria-hidden
                        className="animate-spin motion-reduce:animate-none"
                      />
                    ) : (
                      <GiftIcon data-icon="inline-start" aria-hidden />
                    )}
                    {loading
                      ? 'Đang tạo mã…'
                      : amount >= MIN_AMOUNT
                        ? `Tạo mã QR · ${formatVnd(amount)}`
                        : 'Tạo mã QR mừng cưới'}
                  </Button>
                  <p
                    className={
                      '-mt-1 text-center text-xs text-muted-foreground'
                    }
                  >
                    Chuyển khoản qua mã QR, tiền về thẳng tài khoản của{' '}
                    {FAMILY[side].toLowerCase()}.
                  </p>
                </form>
              </Pane>
            )}

            {step.kind === 'qr' && (
              <Pane key="qr">
                <QrStep
                  payment={step.payment}
                  onBack={reset}
                  onDone={(status) =>
                    setStep(
                      status === 'PAID'
                        ? { kind: 'paid', payment: step.payment }
                        : {
                            kind: 'ended',
                            payment: step.payment,
                            reason:
                              status === 'CANCELLED' ? 'cancelled' : 'expired',
                          },
                    )
                  }
                />
              </Pane>
            )}

            {step.kind === 'paid' && (
              <Pane key="paid">
                <Thanks
                  name={giverName}
                  family={FAMILY[side]}
                  amount={step.payment.amount}
                  onAgain={() => {
                    setMessage('');
                    reset();
                  }}
                />
              </Pane>
            )}

            {step.kind === 'ended' && (
              <Pane key="ended">
                <div
                  className={
                    'flex flex-col items-center gap-4 py-8 text-center'
                  }
                >
                  <span
                    aria-hidden
                    className={`flex size-16 items-center justify-center
                    rounded-full bg-muted ring-8 ring-muted/40`}
                  >
                    <ClockIcon className="size-7 text-muted-foreground" />
                  </span>
                  <p className="font-serif text-2xl">
                    {step.reason === 'expired'
                      ? 'Mã QR đã hết hạn'
                      : 'Giao dịch đã huỷ'}
                  </p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Nếu bạn đã chuyển khoản, đừng lo: cô dâu chú rể vẫn nhận
                    được và sẽ đối soát lại.
                  </p>
                  <Button
                    onClick={reset}
                    variant="outline"
                    size="lg"
                    className="max-sm:h-11"
                  >
                    <RotateCcwIcon data-icon="inline-start" aria-hidden />
                    Tạo mã mới
                  </Button>
                </div>
              </Pane>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Pane({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={
        reduce ? { opacity: 0 } : { opacity: 0, y: 12, filter: 'blur(4px)' }
      }
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={
        reduce ? { opacity: 0 } : { opacity: 0, y: -12, filter: 'blur(4px)' }
      }
      transition={{ duration: reduce ? 0.15 : 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ---------- the QR step ----------

function useCountdown(until: string) {
  const [left, setLeft] = useState(() =>
    Math.max(0, new Date(until).getTime() - Date.now()),
  );
  useEffect(() => {
    const id = setInterval(
      () => setLeft(Math.max(0, new Date(until).getTime() - Date.now())),
      1000,
    );
    return () => clearInterval(id);
  }, [until]);
  return left;
}

function QrStep({
  payment,
  onBack,
  onDone,
}: {
  payment: PublicGiftPayment;
  onBack: () => void;
  onDone: (status: PublicGiftStatus['status']) => void;
}) {
  const reduce = useReducedMotion();
  const left = useCountdown(payment.expiresAt);
  const qrRef = useRef<HTMLDivElement>(null);
  const [saveFailed, setSaveFailed] = useState(false);

  // Guests often pay from the phone showing the invite, which cannot scan
  // its own screen: save the QR as an image their bank app can import
  async function saveQr() {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    setSaveFailed(false);
    const name = `ma-qr-mung-cuoi-${payment.amount}`;
    const download = (href: string, ext: string) => {
      const a = document.createElement('a');
      a.href = href;
      a.download = `${name}.${ext}`;
      a.click();
    };
    try {
      const xml = new XMLSerializer().serializeToString(svg);
      const svgUrl = URL.createObjectURL(
        new Blob([xml], { type: 'image/svg+xml' }),
      );
      try {
        const img = new Image();
        img.src = svgUrl;
        await img.decode();
        const size = 720;
        const pad = 48;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size + pad * 2;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, pad, pad, size, size);
        const png = await new Promise<Blob | null>((r) =>
          canvas.toBlob(r, 'image/png'),
        );
        if (!png) throw new Error('toBlob');
        const pngUrl = URL.createObjectURL(png);
        download(pngUrl, 'png');
        setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
      } catch {
        // canvas unavailable (some in-app browsers): fall back to the SVG
        download(svgUrl, 'svg');
      }
      setTimeout(() => URL.revokeObjectURL(svgUrl), 1000);
    } catch {
      setSaveFailed(true);
    }
  }
  const mm = String(Math.floor(left / 60_000)).padStart(2, '0');
  const ss = String(Math.floor((left % 60_000) / 1000)).padStart(2, '0');

  // ask the API (which asks payOS) until the transfer lands
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const { status } = await clientFetch<PublicGiftStatus>(
            `/public/gifts/${payment.id}`,
          );
          if (stop) return;
          if (status !== 'PENDING') return onDone(status);
        } catch {
          // keep polling; a blip should not lose the QR
        }
      }
      if (!stop) timer = setTimeout(tick, POLL_MS);
    };
    timer = setTimeout(tick, POLL_MS);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [payment.id, onDone]);

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm text-muted-foreground">
          Mở app ngân hàng và quét mã để mừng
        </p>
        <p
          className={`font-serif text-4xl tracking-tight text-rose-deep
            tabular-nums`}
        >
          {formatVnd(payment.amount)}
        </p>
      </div>

      <div className="relative p-3">
        {/* gold corner frame */}
        {[
          'top-0 left-0 border-t-2 border-l-2 rounded-tl-2xl',
          'top-0 right-0 border-t-2 border-r-2 rounded-tr-2xl',
          'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-2xl',
          'bottom-0 right-0 border-b-2 border-r-2 rounded-br-2xl',
        ].map((c) => (
          <span
            key={c}
            aria-hidden
            className={cn('absolute size-8 border-gold', c)}
          />
        ))}
        <div
          ref={qrRef}
          className={`relative rounded-2xl bg-white p-3 shadow-soft ring-1
            ring-foreground/[0.06]`}
        >
          <QRCodeSVG
            value={payment.qrCode}
            size={208}
            level="M"
            fgColor={QR_INK}
            imageSettings={{
              src: HEART,
              height: 40,
              width: 40,
              excavate: true,
            }}
            title={`Mã QR chuyển khoản ${formatVnd(payment.amount)}`}
          />
          {/* scan line */}
          {!reduce && (
            <motion.span
              aria-hidden
              className={`absolute inset-x-3 h-0.5 rounded-full bg-gradient-to-r
              from-transparent via-primary/70 to-transparent`}
              animate={{ top: ['12px', 'calc(100% - 12px)', '12px'] }}
              transition={{
                duration: 3.2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}
        </div>
      </div>

      <div
        className={`flex items-center gap-2 rounded-full bg-secondary px-3.5
          py-1.5 text-sm font-medium text-secondary-foreground`}
      >
        <span aria-hidden className="relative flex size-2.5">
          <span
            className={`absolute inline-flex size-full animate-ping rounded-full
              bg-primary opacity-60 motion-reduce:animate-none`}
          />
          <span
            className={'relative inline-flex size-2.5 rounded-full bg-primary'}
          />
        </span>
        {/* only the stable text is live; the ticking timer is not announced */}
        <span role="status">Đang chờ chuyển khoản</span>
        <span aria-hidden className="font-normal tabular-nums opacity-80">
          · còn {mm}:{ss}
        </span>
      </div>

      <dl
        className={`grid w-full divide-y divide-border/70 rounded-2xl border
          bg-muted/40 px-4 py-1 text-left text-sm`}
      >
        <Row label="Chủ tài khoản" value={payment.accountName} />
        <Row label="Số tài khoản" value={payment.accountNumber} copy />
        <Row
          label="Số tiền"
          value={new Intl.NumberFormat('vi-VN').format(payment.amount)}
          copy={String(payment.amount)}
        />
        <Row label="Nội dung" value={payment.description} copy />
      </dl>

      <div className="grid w-full gap-2 sm:flex sm:flex-wrap sm:justify-center">
        <Button
          variant="outline"
          size="lg"
          onClick={saveQr}
          className="max-sm:h-11 sm:order-3"
        >
          <DownloadIcon data-icon="inline-start" aria-hidden />
          Lưu ảnh mã QR
        </Button>
        {saveFailed && (
          <p role="alert" className="text-sm text-destructive sm:order-4">
            Không lưu được ảnh. Hãy chụp màn hình mã QR hoặc sao chép số tài
            khoản bên trên.
          </p>
        )}
        <a
          href={payment.checkoutUrl}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({
            variant: 'outline',
            size: 'lg',
            className: 'max-sm:h-11 sm:order-2',
          })}
        >
          <ExternalLinkIcon data-icon="inline-start" aria-hidden />
          Trang thanh toán payOS
        </a>
        <Button
          variant="ghost"
          size="lg"
          onClick={onBack}
          className="max-sm:h-11 sm:order-1"
        >
          Đổi số tiền
        </Button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  copy,
}: {
  label: string;
  value: string;
  /** true copies `value`; a string copies that instead */
  copy?: boolean | string;
}) {
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 py-1.5">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1 font-medium">
        <span className="truncate tabular-nums select-all" title={value}>
          {value}
        </span>
        {copy && (
          <button
            type="button"
            title={`Sao chép ${label.toLowerCase()}`}
            aria-label={
              done
                ? `Đã sao chép ${label.toLowerCase()}`
                : `Sao chép ${label.toLowerCase()}`
            }
            className={cn(
              `-mr-2 flex size-10 shrink-0 items-center justify-center
              rounded-lg transition-colors outline-none focus-visible:ring-3
              focus-visible:ring-ring/50`,
              done
                ? 'text-rose-deep'
                : failed
                  ? 'text-destructive'
                  : 'text-muted-foreground hover:bg-card hover:text-foreground',
            )}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  typeof copy === 'string' ? copy : value,
                );
                setFailed(false);
                setDone(true);
                setTimeout(() => setDone(false), 1500);
              } catch {
                // in-app browsers may block the clipboard
                setFailed(true);
                setTimeout(() => setFailed(false), 2500);
              }
            }}
          >
            {done ? (
              <CheckIcon aria-hidden className="size-4" />
            ) : (
              <CopyIcon aria-hidden className="size-4" />
            )}
          </button>
        )}
        {copy && (
          <span role="status" className="sr-only">
            {done
              ? `Đã sao chép ${label.toLowerCase()}`
              : failed
                ? 'Không sao chép được, hãy nhấn giữ để chọn'
                : ''}
          </span>
        )}
      </dd>
    </div>
  );
}

// ---------- decoration & thanks ----------

/** The envelope on the left: floats while waiting, bursts hearts when paid. */
function Envelope({ paid }: { paid: boolean }) {
  const reduce = useReducedMotion();
  return (
    <div
      className={`relative hidden items-center justify-center overflow-hidden
        border-r border-border/70 bg-gradient-to-br from-primary/10
        via-accent/40 to-gold/15 p-8 md:flex`}
    >
      <motion.div
        className="relative w-full max-w-56"
        animate={
          reduce ? undefined : { y: [0, -8, 0], rotate: [-1.5, 1.5, -1.5] }
        }
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg
          viewBox="0 0 200 140"
          aria-hidden
          className="w-full drop-shadow-xl"
        >
          <rect
            x="4"
            y="20"
            width="192"
            height="116"
            rx="12"
            className="fill-card stroke-gold"
            strokeWidth="1.5"
          />
          <motion.path
            d="M4 32 L100 92 L196 32"
            className="fill-none stroke-gold"
            strokeWidth="1.5"
            initial={false}
            animate={{ pathLength: 1 }}
          />
          <path
            d="M4 136 L80 80 M196 136 L120 80"
            className="stroke-gold/60"
            strokeWidth="1"
            fill="none"
          />
          <motion.path
            d="M4 32 Q4 20 16 20 L184 20 Q196 20 196 32 L100 92 Z"
            className="fill-primary/15 stroke-gold"
            strokeWidth="1.5"
            style={{ originY: '20px' }}
            animate={paid ? { rotateX: 180 } : { rotateX: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />
          <circle cx="100" cy="92" r="15" className="fill-rose-deep" />
          <path
            d="M100 99s-6.5-4-6.5-9a3.6 3.6 0 0 1 6.5-2.2 3.6 3.6 0 0 1 6.5 2.2c0 5-6.5 9-6.5 9z"
            className="fill-card"
          />
        </svg>
      </motion.div>
      <p className="absolute bottom-6 font-serif text-2xl text-rose-deep italic">
        Gửi yêu thương
      </p>
      <AnimatePresence>{paid && !reduce && <HeartBurst />}</AnimatePresence>
    </div>
  );
}

function HeartBurst() {
  const hearts = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 260,
        y: -80 - Math.random() * 200,
        r: (Math.random() - 0.5) * 80,
        s: 0.6 + Math.random() * 0.9,
        d: Math.random() * 0.35,
      })),
    [],
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {hearts.map((h) => (
        <motion.span
          key={h.id}
          className="absolute top-1/2 left-1/2"
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{ x: h.x, y: h.y, scale: h.s, rotate: h.r, opacity: 0 }}
          transition={{ duration: 1.8, delay: h.d, ease: 'easeOut' }}
        >
          <HeartIcon className="size-5 fill-primary text-primary" />
        </motion.span>
      ))}
    </div>
  );
}

function Thanks({
  name,
  family,
  amount,
  onAgain,
}: {
  name: string;
  family: string;
  amount: number;
  onAgain: () => void;
}) {
  return (
    <div className="relative flex flex-col items-center gap-4 py-8 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', bounce: 0.5, duration: 0.7 }}
        className={`flex size-20 items-center justify-center rounded-full
          bg-primary/15 ring-8 ring-primary/5`}
      >
        <svg viewBox="0 0 24 24" aria-hidden className="size-8 text-rose-deep">
          <motion.path
            d="M5 12.5l4.5 4.5L19 7.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          />
        </svg>
      </motion.div>
      <p className="font-serif text-4xl font-light text-rose-deep italic">
        Cảm ơn {name}!
      </p>
      <p className="max-w-sm text-muted-foreground">
        {family} đã nhận được{' '}
        <strong className="font-semibold text-foreground tabular-nums">
          {formatVnd(amount)}
        </strong>
        . Tấm lòng của bạn là món quà quý giá nhất trong ngày vui của chúng
        mình.
      </p>
      <Button
        variant="outline"
        size="lg"
        onClick={onAgain}
        className="mt-2 max-sm:h-11"
      >
        <GiftIcon data-icon="inline-start" aria-hidden />
        Gửi thêm một món quà
      </Button>
    </div>
  );
}
