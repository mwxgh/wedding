'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  CheckIcon,
  ClockIcon,
  CopyIcon,
  ExternalLinkIcon,
  GiftIcon,
  HeartIcon,
  RotateCcwIcon,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';

import type {
  GiftPaymentInput,
  PublicGiftPayment,
  PublicGiftStatus,
  Side,
} from '@repo/contracts';
import { Button } from '@repo/ui/components/button';
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

// heart in the middle of the QR, cut out so the code stays scannable
const HEART =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#fff"/><path fill="#b5838d" d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>`,
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
      className={`relative mx-auto max-w-3xl overflow-hidden rounded-3xl border
        bg-card shadow-soft`}
    >
      {/* soft wash behind the content */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -top-32 -right-24 size-80
          rounded-full bg-primary/15 blur-3xl`}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute -bottom-28 -left-20 size-72
          rounded-full bg-gold/15 blur-3xl`}
      />

      <div className="relative grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Envelope paid={step.kind === 'paid'} />

        <div className="p-6 sm:p-8">
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
                      p-1`}
                    >
                      {sides.map((s) => (
                        <button
                          key={s}
                          type="button"
                          role="radio"
                          aria-checked={side === s}
                          onClick={() => setSide(s)}
                          className={cn(
                            `relative rounded-full px-4 py-2 text-sm font-medium
                            transition-colors`,
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
                    <p className="text-center text-sm text-muted-foreground">
                      Gửi mừng tới {FAMILY[side].toLowerCase()}
                    </p>
                  )}

                  <fieldset className="grid gap-2.5">
                    <legend className="mb-2.5 text-sm font-medium">
                      Số tiền mừng
                    </legend>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
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
                            `rounded-xl border px-2 py-2.5 text-sm font-medium
                            tabular-nums transition-all`,
                            preset === v
                              ? `border-primary bg-primary/10 text-rose-deep
                                shadow-sm`
                              : 'hover:border-primary/50 hover:bg-muted/60',
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
                          `rounded-xl border px-2 py-2.5 text-sm font-medium
                          transition-all`,
                          preset === null
                            ? `border-primary bg-primary/10 text-rose-deep
                              shadow-sm`
                            : 'hover:border-primary/50 hover:bg-muted/60',
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
                          <div className="relative pt-1">
                            <Input
                              inputMode="numeric"
                              autoFocus
                              aria-label="Số tiền khác"
                              placeholder="Nhập số tiền"
                              className="pr-10 text-base tabular-nums"
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
                              className={`absolute top-1/2 right-3 mt-0.5
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

                  <Button type="submit" size="lg" disabled={loading}>
                    <GiftIcon data-icon="inline-start" />
                    {loading
                      ? 'Đang tạo mã…'
                      : amount >= MIN_AMOUNT
                        ? `Tạo mã QR · ${formatVnd(amount)}`
                        : 'Tạo mã QR mừng cưới'}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
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
                  className={`flex flex-col items-center gap-4 py-10
                  text-center`}
                >
                  <ClockIcon className="size-10 text-muted-foreground" />
                  <p className="font-serif text-2xl">
                    {step.reason === 'expired'
                      ? 'Mã QR đã hết hạn'
                      : 'Giao dịch đã huỷ'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Nếu bạn đã chuyển khoản, đừng lo: cô dâu chú rể vẫn nhận
                    được và sẽ đối soát lại.
                  </p>
                  <Button onClick={reset} variant="outline">
                    <RotateCcwIcon data-icon="inline-start" />
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
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
  const left = useCountdown(payment.expiresAt);
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
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="text-sm text-muted-foreground">
        Mở app ngân hàng và quét mã để mừng
      </p>
      <p className="font-serif text-3xl text-rose-deep tabular-nums">
        {formatVnd(payment.amount)}
      </p>

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
        <div className="relative rounded-xl bg-white p-3 shadow-sm">
          <QRCodeSVG
            value={payment.qrCode}
            size={208}
            level="M"
            fgColor="#3b2f2a"
            imageSettings={{
              src: HEART,
              height: 40,
              width: 40,
              excavate: true,
            }}
            title={`Mã QR chuyển khoản ${formatVnd(payment.amount)}`}
          />
          {/* scan line */}
          <motion.span
            aria-hidden
            className={`absolute inset-x-3 h-0.5 rounded-full bg-gradient-to-r
              from-transparent via-primary/70 to-transparent`}
            animate={{ top: ['12px', 'calc(100% - 12px)', '12px'] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="relative flex size-2.5">
          <span
            className={`absolute inline-flex size-full animate-ping rounded-full
              bg-primary opacity-60`}
          />
          <span
            className={'relative inline-flex size-2.5 rounded-full bg-primary'}
          />
        </span>
        Đang chờ chuyển khoản
        <span className="text-muted-foreground tabular-nums">
          · còn {mm}:{ss}
        </span>
      </div>

      <dl
        className={`grid w-full gap-1.5 rounded-2xl bg-muted/60 p-4 text-left
          text-sm`}
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

      <div className="flex w-full flex-wrap justify-center gap-2">
        <Button variant="ghost" onClick={onBack}>
          Đổi số tiền
        </Button>
        <a
          href={payment.checkoutUrl}
          target="_blank"
          rel="noreferrer"
          className={cn(
            `inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm
            font-medium hover:bg-muted`,
          )}
        >
          <ExternalLinkIcon className="size-4" />
          Trang thanh toán payOS
        </a>
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
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1.5 font-medium">
        <span className="truncate">{value}</span>
        {copy && (
          <button
            type="button"
            title={`Sao chép ${label.toLowerCase()}`}
            className={`rounded-md p-1 text-muted-foreground hover:bg-card
            hover:text-foreground`}
            onClick={async () => {
              await navigator.clipboard.writeText(
                typeof copy === 'string' ? copy : value,
              );
              setDone(true);
              setTimeout(() => setDone(false), 1500);
            }}
          >
            {done ? (
              <CheckIcon className="size-3.5 text-primary" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
          </button>
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
        border-r bg-gradient-to-br from-primary/10 via-transparent to-gold/10
        p-8 md:flex`}
    >
      <motion.div
        className="relative w-full max-w-56"
        animate={
          reduce ? undefined : { y: [0, -8, 0], rotate: [-1.5, 1.5, -1.5] }
        }
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg viewBox="0 0 200 140" className="w-full drop-shadow-xl">
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
      <p className="absolute bottom-6 font-script text-2xl text-rose-deep">
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
        className={`flex size-16 items-center justify-center rounded-full
          bg-primary/15`}
      >
        <svg viewBox="0 0 24 24" className="size-8 text-rose-deep">
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
      <p className="font-script text-4xl text-rose-deep">Cảm ơn {name}!</p>
      <p className="max-w-sm text-muted-foreground">
        {family} đã nhận được{' '}
        <strong className="text-foreground">{formatVnd(amount)}</strong>. Tấm
        lòng của bạn là món quà quý giá nhất trong ngày vui của chúng mình.
      </p>
      <Button variant="ghost" onClick={onAgain}>
        Gửi thêm một món quà
      </Button>
    </div>
  );
}
